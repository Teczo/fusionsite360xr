import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Bot, SendHorizontal, Settings, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { aiApi } from '../services/api';
import ChatMessage from '../components/ai/ChatMessage';
import SuggestedPrompts from '../components/ai/SuggestedPrompts';
import EmptyState from '../components/ui/EmptyState';
import ThreadSidebar from '../components/ai/ThreadSidebar';

export default function AiPage() {
  const location = useLocation();
  const projectId = new URLSearchParams(location.search).get('id');

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  // Collapse sidebar by default on narrow screens
  useEffect(() => {
    if (window.innerWidth < 768) setSidebarOpen(false);
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea up to 120px
  useEffect(() => {
    const ta = inputRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [input]);

  async function handleSend(overrideQuestion = null) {
    const question = (overrideQuestion || input).trim();
    if (!question || isLoading) return;
    setInput('');

    // Create thread if this is the first message
    let threadId = activeThreadId;
    if (!threadId) {
      try {
        const newThread = await aiApi.createThread(projectId);
        threadId = newThread._id;
        setActiveThreadId(threadId);
      } catch (err) {
        console.error('Failed to create thread:', err);
        // Continue without thread — fall back to stateless mode
      }
    }

    // Add user message to local state immediately
    const userMsg = { _id: Date.now().toString(), role: 'user', content: question };
    const loadingId = (Date.now() + 1).toString();

    setMessages(prev => [
      ...prev,
      userMsg,
      { _id: loadingId, role: 'assistant', isLoading: true },
    ]);
    setIsLoading(true);

    try {
      const result = await aiApi.query(projectId, question, null, threadId);

      setMessages(prev =>
        prev.map(msg =>
          msg._id === loadingId
            ? {
                ...msg,
                isLoading: false,
                content: result.explanation || 'No explanation available.',
                data: result.data,
                intent: result.intent,
                provider: result.provider,
                auditLogId: result.auditLogId,
                suggestedFollowUps: result.suggestedFollowUps || [],
              }
            : msg
        )
      );
    } catch (err) {
      setMessages(prev =>
        prev.map(msg =>
          msg._id === loadingId
            ? {
                ...msg,
                isLoading: false,
                content: `Error: ${err.message}`,
                isError: true,
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSelectThread(threadId) {
    setActiveThreadId(threadId);
    setLoadingMessages(true);
    try {
      const msgs = await aiApi.getThreadMessages(threadId);
      // Map DB messages to local format
      setMessages(msgs.map(m => ({
        _id: m._id,
        role: m.role,
        content: m.content,
        data: m.data,
        intent: m.intent,
        provider: m.provider,
        auditLogId: m.auditLogId,
        suggestedFollowUps: m.suggestedFollowUps || [],
      })));
    } catch (err) {
      console.error('Failed to load messages:', err);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
    // Auto-close sidebar on mobile after selecting
    if (window.innerWidth < 768) setSidebarOpen(false);
  }

  function handleNewChat() {
    setActiveThreadId(null);
    setMessages([]);
    setInput('');
    if (window.innerWidth < 768) setSidebarOpen(false);
  }

  function handleFollowUpSelect(suggestion) {
    handleSend(suggestion);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleSuggestedPrompt(prompt) {
    setInput(prompt);
    inputRef.current?.focus();
  }

  // No project selected
  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-full">
        <EmptyState
          title="No project selected"
          description="Open a project from the dashboard to use the AI Assistant."
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#f7f7f9]">
      {/* Page header */}
      <div className="shrink-0 bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center gap-3">
        {/* Sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(prev => !prev)}
          className="p-1.5 rounded-lg text-textsec hover:text-textpri hover:bg-gray-100 transition-all shrink-0"
          title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
        >
          {sidebarOpen
            ? <PanelLeftClose className="w-4 h-4" />
            : <PanelLeftOpen className="w-4 h-4" />
          }
        </button>

        <div className="w-9 h-9 rounded-xl bg-brand/10 grid place-items-center shrink-0">
          <Bot className="w-5 h-5 text-brand" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-textpri leading-tight">AI Assistant</h1>
          <p className="text-sm text-textsec truncate">Project: {projectId}</p>
        </div>
        <Link
          to={`/ai-settings?id=${projectId}`}
          title="AI Settings"
          className="p-2 rounded-lg text-textsec hover:text-textpri hover:bg-gray-100 transition-all"
        >
          <Settings className="w-4 h-4" />
        </Link>
      </div>

      {/* Body: sidebar + chat */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Thread Sidebar */}
        {sidebarOpen && (
          <ThreadSidebar
            projectId={projectId}
            activeThreadId={activeThreadId}
            onSelectThread={handleSelectThread}
            onNewChat={handleNewChat}
          />
        )}

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Messages */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4">
            {loadingMessages ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex gap-1 items-center">
                  <span className="w-2 h-2 bg-textsec rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-textsec rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-textsec rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            ) : messages.length === 0 ? (
              /* Welcome state */
              <div className="flex flex-col items-center justify-center min-h-full text-center px-4 py-12">
                <div className="w-16 h-16 rounded-2xl bg-brand/10 grid place-items-center mb-4">
                  <Bot className="w-8 h-8 text-brand" />
                </div>
                <h2 className="text-xl font-semibold text-textpri mb-2">FusionXR AI Assistant</h2>
                <p className="text-sm text-textsec max-w-md">
                  Ask anything about your project — schedules, costs, safety, BIM data, documents, and more.
                </p>
                <SuggestedPrompts onSelect={handleSuggestedPrompt} />
              </div>
            ) : (
              /* Message list */
              <div className="max-w-3xl mx-auto w-full">
                {messages.map((msg) => (
                  <ChatMessage
                    key={msg._id}
                    role={msg.role}
                    content={msg.content}
                    data={msg.data}
                    intent={msg.intent}
                    provider={msg.provider}
                    auditLogId={msg.auditLogId}
                    isLoading={msg.isLoading}
                    isError={msg.isError}
                    suggestedFollowUps={msg.suggestedFollowUps}
                    onFollowUpSelect={handleFollowUpSelect}
                  />
                ))}
                <div ref={chatEndRef} />
              </div>
            )}
          </div>

          {/* Input bar — pinned to bottom */}
          <div className="shrink-0 bg-white border-t border-gray-100 px-4 sm:px-6 py-4">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-end gap-3">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask something about your project…"
                  rows={1}
                  className="flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-textpri placeholder:text-textsec focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/40 transition-all overflow-hidden"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isLoading}
                  aria-label="Send message"
                  className="shrink-0 w-10 h-10 rounded-xl bg-brand text-white grid place-items-center hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <SendHorizontal className="w-4 h-4" />
                </button>
              </div>
              <p className="mt-2 text-[11px] text-textsec text-center select-none">
                Press{' '}
                <kbd className="px-1.5 py-0.5 rounded-md text-[10px] border border-gray-200 bg-white font-mono">
                  Enter
                </kbd>{' '}
                to send ·{' '}
                <kbd className="px-1.5 py-0.5 rounded-md text-[10px] border border-gray-200 bg-white font-mono">
                  Shift+Enter
                </kbd>{' '}
                for a new line
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
