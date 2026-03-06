import mongoose from 'mongoose';
import Project from '../models/Project.js';
import { getProvider } from '../services/ai/llmAdapter.js';
import { AI_TOOLS, AI_SYSTEM_PROMPT } from '../services/ai/tools.js';
import { executeTool } from '../services/ai/toolExecutor.js';
import AIAuditLog from '../models/AIAuditLog.js';
import ChatThread from '../models/ChatThread.js';
import ChatMessage from '../models/ChatMessage.js';

/**
 * Estimate token count based on English text length (approx 4 chars/token).
 */
function estimateTokens(messages) {
  if (!Array.isArray(messages)) return 0;
  return messages.reduce((sum, msg) => sum + (msg.content?.length || 0) / 4, 0);
}

/**
 * Trim history to stay within token limits and message count.
 */
function trimHistory(history, maxTokens = 2000) {
  if (!Array.isArray(history)) return [];

  let trimmed = [...history].filter(msg => msg.role && typeof msg.content === 'string');

  // Enforce max count
  trimmed = trimmed.slice(-10);

  // Enforce max tokens
  while (trimmed.length > 0 && estimateTokens(trimmed) > maxTokens) {
    trimmed.shift(); // Remove oldest
  }

  // Clean up if it starts with assistant
  if (trimmed.length > 0 && trimmed[0].role === 'assistant') {
    trimmed.shift();
  }

  return trimmed;
}

/**
 * Parse LLM explanation text that may contain a FOLLOW_UPS: JSON line.
 * Returns { explanation, suggestedFollowUps }.
 */
function parseExplanationAndFollowUps(rawResponse) {
  if (!rawResponse) return { explanation: null, suggestedFollowUps: [] };

  const lines = rawResponse.split('\n');
  const explanationLines = [];
  let suggestedFollowUps = [];

  for (const line of lines) {
    if (line.trim().startsWith('FOLLOW_UPS:')) {
      try {
        const jsonStr = line.trim().replace('FOLLOW_UPS:', '').trim();
        const parsed = JSON.parse(jsonStr);
        if (Array.isArray(parsed)) {
          suggestedFollowUps = parsed.slice(0, 3);
        }
      } catch (e) {
        // LLM didn't format correctly — skip, not critical
        console.warn('Failed to parse follow-ups:', e.message);
      }
    } else {
      explanationLines.push(line);
    }
  }

  return {
    explanation: explanationLines.join('\n').trim() || null,
    suggestedFollowUps
  };
}

/**
 * Detect if a query needs multi-step chaining.
 * Returns true if the LLM selected a tool but critical required args are missing,
 * meaning it needs to look something up first.
 */
function detectChainingNeeded(classification) {
  if (!classification.toolName) return false;

  const { toolName, args } = classification;

  // Cascading delay without activityId — needs to look up the activity first
  if (toolName === 'simulate_cascading_delay' && !args?.activityId) {
    return true;
  }

  // Element metadata without componentId — needs 3D selection or a lookup
  if (toolName === 'get_element_metadata' && !args?.componentId) {
    return true;
  }

  return false;
}

/**
 * Multi-step agent loop for complex queries that require chaining tool calls.
 * The LLM calls a tool, sees the result, then decides if it needs another tool.
 * Stops when the LLM provides a text answer or maxSteps is reached.
 */
async function agentLoop(provider, question, projectId, userId, selectedElementId, conversationHistory = [], maxSteps = 3) {
  const messages = [
    ...conversationHistory,
    { role: 'user', content: question }
  ];
  const allResults = [];
  const toolsCalled = [];

  for (let step = 0; step < maxSteps; step++) {
    // Ask LLM to classify (passing full conversation history)
    let classification;
    try {
      classification = await provider.classifyIntent(
        messages,
        AI_TOOLS,
        AI_SYSTEM_PROMPT
      );
    } catch (classifyErr) {
      console.error(`Agent loop classification error (step ${step}):`, classifyErr.message);
      break; // Exit loop, explain what we have so far
    }

    // If LLM chose no tool, it's ready to answer
    if (!classification.toolName) {
      return {
        intent: allResults.length > 0 ? 'multi-step' : 'general',
        data: allResults.length > 0 ? allResults : null,
        explanation: classification.fallbackText || 'Analysis complete based on the available data.',
        suggestedFollowUps: []
      };
    }

    // Execute the selected tool
    const toolArgs = {
      ...classification.args,
      projectId,
      userId,
      componentId: selectedElementId || classification.args?.componentId
    };

    const result = await executeTool(classification.toolName, toolArgs);
    toolsCalled.push(classification.toolName);

    allResults.push({
      tool: classification.toolName,
      result: result.success ? result.data : { error: result.message }
    });

    // If tool failed, stop chaining — explain what we have
    if (result.error) {
      break;
    }

    // Feed result back to LLM as conversation history
    // Truncate large results to stay within token budget
    const resultSummary = JSON.stringify(result.data);
    const truncatedResult = resultSummary.length > 3000
      ? resultSummary.substring(0, 3000) + '... [truncated]'
      : resultSummary;

    messages.push({
      role: 'assistant',
      content: `I called the tool "${classification.toolName}" and got this data:\n${truncatedResult}`
    });

    messages.push({
      role: 'user',
      content: 'Based on this data, do you need to call another tool to fully answer the original question, or can you provide a complete answer now?'
    });
  }

  // Max steps reached or loop exited early — generate explanation from collected data
  let rawExplanation = null;
  try {
    rawExplanation = await provider.generateExplanation(
      'multi-step',
      allResults,
      question,
      conversationHistory
    );
  } catch (explainErr) {
    console.error('Agent loop explanation failed:', explainErr.message);
  }

  const { explanation, suggestedFollowUps } = parseExplanationAndFollowUps(rawExplanation);

  return {
    intent: 'multi-step',
    data: allResults,
    explanation: explanation || 'Analysis complete. See the structured data below.',
    suggestedFollowUps,
    toolsCalled
  };
}

/**
 * Log an AI query to the audit log. Returns the log entry ID for feedback.
 * Never throws — returns null on failure.
 */
async function logAIQuery({ userId, projectId, question, intent, provider, toolsCalled, isMultiStep, stepsUsed, startTime, success, error }) {
  try {
    const log = await AIAuditLog.create({
      userId,
      projectId: projectId || null,
      question: question?.substring(0, 500),
      intent: intent || 'unknown',
      provider: provider || 'unknown',
      toolsCalled: toolsCalled || [],
      isMultiStep: isMultiStep || false,
      stepsUsed: stepsUsed || 1,
      responseTimeMs: Date.now() - startTime,
      success: success !== false,
      error: error || null
    });
    return log._id;
  } catch (err) {
    console.error('Audit log write failed:', err.message);
    return null;
  }
}

export async function handleAIQuery(req, res) {
  const startTime = Date.now();
  try {
    const { projectId, question, selectedElementId, history, threadId } = req.body;
    const userId = req.userId; // Set by authMiddleware (Phase 0)

    // --- Thread Management ---
    let activeThreadId = threadId || null;
    let conversationHistory = [];

    if (activeThreadId) {
      // Load recent messages from DB for conversation context
      try {
        const recentMessages = await ChatMessage.find({ threadId: activeThreadId })
          .sort({ createdAt: -1 })
          .limit(10)
          .lean();

        // Reverse to chronological order, map to LLM format (text only)
        conversationHistory = recentMessages
          .reverse()
          .map(msg => ({
            role: msg.role,
            content: msg.content
          }));
      } catch (err) {
        console.error('Failed to load thread history:', err);
        // Continue without history — don't fail the query
      }

      // Save the user message to the thread before processing
      try {
        await ChatMessage.create({
          threadId: activeThreadId,
          role: 'user',
          content: question
        });
        await ChatThread.updateOne(
          { _id: activeThreadId },
          { lastMessageAt: new Date() }
        );
      } catch (err) {
        console.error('Failed to save user message:', err);
      }
    } else {
      // Fallback: use client-sent history array (backward compatibility)
      conversationHistory = trimHistory(history);
    }

    // --- Phase 0: ObjectId validation ---
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid project ID format',
      });
    }

    // --- Phase 0: Ownership check ---
    const project = await Project.findOne({ _id: projectId, userId }).lean();

    if (!project) {
      return res.status(403).json({
        success: false,
        error: 'You do not have access to this project',
      });
    }

    // --- Phase 3: Get BYOK provider ---
    const provider = await getProvider(userId);

    // --- Phase 3: LLM classifies intent (picks a tool) ---
    // If we have history, pass the messages array instead of a string
    const classifyInput = conversationHistory.length > 0
      ? [...conversationHistory, { role: 'user', content: question }]
      : question;

    const classification = await provider.classifyIntent(
      classifyInput,
      AI_TOOLS,
      AI_SYSTEM_PROMPT
    );

    // --- Phase 6: Detect if multi-step chaining is needed ---
    const needsChaining = detectChainingNeeded(classification);

    if (needsChaining) {
      const agentResult = await agentLoop(
        provider, question, projectId, userId, selectedElementId, conversationHistory
      );

      const auditLogId = await logAIQuery({
        userId, projectId, question,
        intent: agentResult.intent,
        provider: provider.name,
        toolsCalled: agentResult.toolsCalled || [],
        isMultiStep: true,
        stepsUsed: agentResult.data?.length || 1,
        startTime, success: true
      });

      // Save AI response to thread
      if (activeThreadId) {
        try {
          await ChatMessage.create({
            threadId: activeThreadId,
            role: 'assistant',
            content: agentResult.explanation || 'Analysis complete.',
            data: agentResult.data,
            intent: agentResult.intent,
            provider: provider.name,
            auditLogId: auditLogId || undefined,
            suggestedFollowUps: agentResult.suggestedFollowUps || []
          });
          await autoTitleThread(activeThreadId, question);
        } catch (err) {
          console.error('Failed to save AI agent message:', err);
        }
      }

      return res.json({
        success: true,
        intent: agentResult.intent,
        data: agentResult.data,
        explanation: agentResult.explanation,
        provider: provider.name,
        auditLogId,
        threadId: activeThreadId || null,
        suggestedFollowUps: agentResult.suggestedFollowUps || []
      });
    }
    // --- End Phase 6 addition ---

    // --- If LLM chose no tool, return text response ---
    if (!classification.toolName) {
      const auditLogId = await logAIQuery({
        userId, projectId, question,
        intent: 'general',
        provider: provider.name,
        toolsCalled: [],
        startTime, success: true
      });

      const responseText = classification.fallbackText ||
        'I was not able to determine what data to look up. Try asking about schedule, cost, safety incidents, or BIM elements.';

      const { explanation: parsedExplanation, suggestedFollowUps } = parseExplanationAndFollowUps(responseText);
      const finalExplanation = parsedExplanation || responseText;

      // Save AI response to thread
      if (activeThreadId) {
        try {
          await ChatMessage.create({
            threadId: activeThreadId,
            role: 'assistant',
            content: finalExplanation,
            intent: 'general',
            provider: provider.name,
            auditLogId: auditLogId || undefined,
            suggestedFollowUps
          });
          await autoTitleThread(activeThreadId, question);
        } catch (err) {
          console.error('Failed to save AI general message:', err);
        }
      }

      return res.json({
        success: true,
        intent: 'general',
        data: null,
        explanation: finalExplanation,
        auditLogId,
        threadId: activeThreadId || null,
        suggestedFollowUps
      });
    }

    // --- Phase 3: Execute the selected tool ---
    // projectId is always injected from the validated request — never trusted from LLM args
    const toolArgs = {
      ...classification.args,
      projectId,
      userId,
      componentId: selectedElementId || classification.args?.componentId,
    };

    const result = await executeTool(classification.toolName, toolArgs);

    // --- If tool execution failed, return error gracefully ---
    if (result.error) {
      const auditLogId = await logAIQuery({
        userId, projectId, question,
        intent: classification.toolName,
        provider: provider.name,
        toolsCalled: [classification.toolName],
        startTime, success: false,
        error: result.message
      });

      const errorExplanation = result.message || 'Unable to retrieve data for this query.';

      if (activeThreadId) {
        try {
          await ChatMessage.create({
            threadId: activeThreadId,
            role: 'assistant',
            content: errorExplanation,
            intent: classification.toolName,
            provider: provider.name,
            auditLogId: auditLogId || undefined,
            suggestedFollowUps: []
          });
          await autoTitleThread(activeThreadId, question);
        } catch (err) {
          console.error('Failed to save AI error message:', err);
        }
      }

      return res.json({
        success: true, // pipeline succeeded; data retrieval failed
        intent: classification.toolName,
        data: null,
        explanation: errorExplanation,
        auditLogId,
        threadId: activeThreadId || null,
        suggestedFollowUps: []
      });
    }

    // --- Phase 3: LLM explains the structured data ---
    let rawExplanation = null;

    // Skip explanation for very large result sets to save tokens/cost
    const resultJson = JSON.stringify(result.data);
    if (resultJson.length < 15000) {
      try {
        rawExplanation = await provider.generateExplanation(
          classification.toolName,
          result.data,
          question,
          conversationHistory
        );
      } catch (explainErr) {
        // Graceful degradation — if explanation fails, still return the data
        console.error('Explanation generation failed:', explainErr.message);
        rawExplanation = null;
      }
    } else {
      rawExplanation = `Found ${Array.isArray(result.data) ? result.data.length : 'multiple'} records. The structured data is included below.`;
    }

    const { explanation, suggestedFollowUps } = parseExplanationAndFollowUps(rawExplanation);
    const finalExplanation = explanation || 'Data retrieved successfully. See the structured results below.';

    // --- Return response (MUST match frontend contract) ---
    const auditLogId = await logAIQuery({
      userId, projectId, question,
      intent: classification.toolName,
      provider: provider.name,
      toolsCalled: [classification.toolName],
      startTime, success: true
    });

    // Save AI response to thread
    if (activeThreadId) {
      try {
        await ChatMessage.create({
          threadId: activeThreadId,
          role: 'assistant',
          content: finalExplanation,
          data: result.data,
          intent: classification.toolName,
          provider: provider.name,
          auditLogId: auditLogId || undefined,
          suggestedFollowUps
        });
        await autoTitleThread(activeThreadId, question);
      } catch (err) {
        console.error('Failed to save AI message:', err);
      }
    }

    return res.json({
      success: true,
      intent: classification.toolName,
      data: result.data,
      explanation: finalExplanation,
      provider: provider.name,
      auditLogId,
      threadId: activeThreadId || null,
      suggestedFollowUps
    });
  } catch (err) {
    // --- Phase 0: Sanitized error response ---
    console.error('AI Query Error:', err);
    // Fire-and-forget — we're already in an error state
    logAIQuery({
      userId: req.userId,
      projectId: req.body?.projectId,
      question: req.body?.question,
      intent: 'error',
      provider: 'unknown',
      toolsCalled: [],
      startTime, success: false,
      error: err.message
    });

    // Try to save error message to thread
    if (req.body?.threadId) {
      ChatMessage.create({
        threadId: req.body.threadId,
        role: 'assistant',
        content: 'Sorry, something went wrong processing your question.',
      }).catch(() => {});
    }

    return res.status(500).json({
      success: false,
      error: 'An internal error occurred. Please try again.',
    });
  }
}

/**
 * Auto-generate thread title from the first message if still "New Chat".
 * Never throws — fire and forget.
 */
async function autoTitleThread(threadId, question) {
  try {
    const thread = await ChatThread.findById(threadId).lean();
    if (thread && thread.title === 'New Chat') {
      const autoTitle = question.length > 50
        ? question.substring(0, 47) + '...'
        : question;
      await ChatThread.updateOne({ _id: threadId }, { title: autoTitle });
    }
  } catch (err) {
    console.error('Failed to auto-title thread:', err);
  }
}
