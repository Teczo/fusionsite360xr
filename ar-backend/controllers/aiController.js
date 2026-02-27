import mongoose from 'mongoose';
import Project from '../models/Project.js';
import { getProvider } from '../services/ai/llmAdapter.js';
import { AI_TOOLS, AI_SYSTEM_PROMPT } from '../services/ai/tools.js';
import { executeTool } from '../services/ai/toolExecutor.js';

export async function handleAIQuery(req, res) {
  try {
    const { projectId, question, selectedElementId } = req.body;
    const userId = req.userId; // Set by authMiddleware (Phase 0)

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
    const classification = await provider.classifyIntent(
      question,
      AI_TOOLS,
      AI_SYSTEM_PROMPT
    );

    // --- If LLM chose no tool, return text response ---
    if (!classification.toolName) {
      return res.json({
        success: true,
        intent: 'general',
        data: null,
        explanation:
          classification.fallbackText ||
          'I was not able to determine what data to look up. Try asking about schedule, cost, safety incidents, or BIM elements.',
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
      return res.json({
        success: true, // pipeline succeeded; data retrieval failed
        intent: classification.toolName,
        data: null,
        explanation:
          result.message || 'Unable to retrieve data for this query.',
      });
    }

    // --- Phase 3: LLM explains the structured data ---
    let explanation = null;

    // Skip explanation for very large result sets to save tokens/cost
    const resultJson = JSON.stringify(result.data);
    if (resultJson.length < 15000) {
      try {
        explanation = await provider.generateExplanation(
          classification.toolName,
          result.data,
          question
        );
      } catch (explainErr) {
        // Graceful degradation — if explanation fails, still return the data
        console.error('Explanation generation failed:', explainErr.message);
        explanation = null;
      }
    } else {
      explanation = `Found ${Array.isArray(result.data) ? result.data.length : 'multiple'} records. The structured data is included below.`;
    }

    // --- Return response (MUST match frontend contract) ---
    return res.json({
      success: true,
      intent: classification.toolName,
      data: result.data,
      explanation:
        explanation || 'Data retrieved successfully. See the structured results below.',
      provider: provider.name, // additive field — frontend can safely ignore
    });
  } catch (err) {
    // --- Phase 0: Sanitized error response ---
    console.error('AI Query Error:', err);
    return res.status(500).json({
      success: false,
      error: 'An internal error occurred. Please try again.',
    });
  }
}
