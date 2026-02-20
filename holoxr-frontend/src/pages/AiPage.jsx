import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bot, SendHorizontal, Info, Lightbulb } from 'lucide-react';
import EmptyState from '../components/ui/EmptyState';

const API = import.meta.env.VITE_API_URL;

const INITIAL_MESSAGES = [
  {
    id: 1,
    role: 'assistant',
    text: "Hello! I'm your FusionXR AI Assistant. Ask me anything about your project — overdue tasks, weekly schedule, cost by phase, safety incidents, and more.",
  },
];

const SUGGESTED_PROMPTS = [
  "Summarise today's HSE incidents",
  'What is the current timeline status?',
  'Show documents uploaded this week',
  'Are there any overdue tasks?',
];

export default function AiPage() {
  const location = useLocation();
  const projectId = new URLSearchParams(location.search).get('id');

  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Scroll to the latest message whenever messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea up to 120 px tall
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [input]);

  const sendMessage = async () => {
    const question = input.trim();
    if (!question || loading) return;

    setMessages((prev) => [...prev, { id: Date.now(), role: 'user', text: question }]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(`${API}/api/ai/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, question }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Request failed');
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          intent: result.intent,
          data: result.data,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          text: `Error: ${err.message}`,
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // No project selected — show empty state
  if (!projectId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <EmptyState
          title="No project selected"
          description="Open a project from the dashboard to use the AI Assistant."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Page header ── */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-brand/10 grid place-items-center shrink-0">
          <Bot className="w-5 h-5 text-brand" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-textpri leading-tight">AI Assistant</h1>
          <p className="text-sm text-textsec truncate">Project: {projectId}</p>
        </div>
      </div>

      {/* ── Chat layout ── */}
      <div className="flex gap-4 items-start">
        {/* Left: conversation thread */}
        <div className="flex-1 flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Message list */}
          <div
            className="overflow-y-auto p-4 sm:p-6 space-y-4"
            style={{ maxHeight: '60vh', minHeight: '240px' }}
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                {msg.role === 'assistant' ? (
                  <div className="w-8 h-8 rounded-full bg-brand/10 grid place-items-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-brand" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-100 grid place-items-center shrink-0 mt-0.5 text-[11px] font-semibold text-textsec">
                    You
                  </div>
                )}

                {/* Bubble */}
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-brand text-white rounded-tr-sm'
                      : msg.isError
                      ? 'bg-red-50 text-red-700 rounded-tl-sm border border-red-100'
                      : 'bg-gray-50 text-textpri rounded-tl-sm border border-gray-100'
                  }`}
                >
                  {msg.text && <span>{msg.text}</span>}
                  {msg.intent && (
                    <span className="block text-xs text-textsec mb-1 font-medium uppercase tracking-wide">
                      {msg.intent.replace(/_/g, ' ')}
                    </span>
                  )}
                  {msg.data !== undefined && (
                    <pre className="mt-1 text-xs overflow-x-auto whitespace-pre-wrap break-words">
                      {typeof msg.data === 'string'
                        ? msg.data
                        : JSON.stringify(msg.data, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            ))}
            {/* Loading indicator */}
            {loading && (
              <div className="flex gap-2 flex-row">
                <div className="w-8 h-8 rounded-full bg-brand/10 grid place-items-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-brand" />
                </div>
                <div className="max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed bg-gray-50 text-textsec rounded-tl-sm border border-gray-100">
                  Thinking…
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-gray-100 p-4 bg-white">
            <div className="flex items-end gap-3">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask something about your project…"
                rows={1}
                className="flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-textpri placeholder:text-textsec focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/40 transition-all overflow-hidden"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
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

        {/* Right: context panel (desktop only) */}
        <div className="w-64 xl:w-72 shrink-0 hidden lg:flex flex-col gap-3">
          {/* Project context */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-textpri mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-textsec" />
              Project Context
            </h3>
            <div className="space-y-1.5 text-xs text-textsec">
              <div className="flex items-center justify-between gap-2">
                <span>Project ID</span>
                <span className="font-mono text-textpri text-[11px] truncate max-w-[120px] bg-gray-50 px-2 py-0.5 rounded">
                  {projectId}
                </span>
              </div>
            </div>
          </div>

          {/* Suggested prompts */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-textpri mb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              Suggested Prompts
            </h3>
            <div className="flex flex-col gap-1.5">
              {SUGGESTED_PROMPTS.map((hint) => (
                <button
                  key={hint}
                  onClick={() => setInput(hint)}
                  className="text-left text-xs px-3 py-2 rounded-lg border border-gray-100 hover:border-brand/30 hover:bg-brand-50 text-textsec hover:text-brand transition-all"
                >
                  {hint}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
