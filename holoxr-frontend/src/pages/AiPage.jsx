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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      const token = localStorage.getItem('token');

      if (!token) {
        setMessages((prev) => [...prev, { id: Date.now() + 1, role: 'assistant', text: 'Authentication error: Please log in again.', isError: true }]);
        return;
      }

      const response = await fetch(`${API}/api/ai/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ projectId, question }),
      });

      const result = await response.json();

      if (response.status === 401) {
        setMessages((prev) => [...prev, { id: Date.now() + 1, role: 'assistant', text: 'Session expired. Please log in again.', isError: true }]);
        return;
      }

      if (!response.ok) throw new Error(result.error || 'Request failed');

      setMessages((prev) => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        intent: result.intent,
        data: result.data,
        explanation: result.explanation ?? null,
      }]);
    } catch (err) {
      setMessages((prev) => [...prev, { id: Date.now() + 1, role: 'assistant', text: `Error: ${err.message}`, isError: true }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  if (!projectId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <EmptyState title="No project selected" description="Open a project from the dashboard to use the AI Assistant." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Page header — ES style */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#2C97D4]/10 grid place-items-center shrink-0">
          <Bot className="w-5 h-5 text-[#2C97D4]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-textpri leading-tight" style={{ fontFamily: "'Syne', 'Inter', sans-serif" }}>AI Assistant</h1>
          <p className="text-sm text-textsec">Ask questions about your project data</p>
        </div>
      </div>

      {/* Chat layout */}
      <div className="flex gap-4 items-start">
        {/* Left: conversation thread */}
        <div className="flex-1 flex flex-col bg-surface rounded-xl border border-border shadow-card overflow-hidden">
          {/* Message list */}
          <div className="overflow-y-auto p-4 space-y-3" style={{ maxHeight: '58vh', minHeight: '220px' }}>
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                {msg.role === 'assistant' ? (
                  <div className="w-7 h-7 rounded-full bg-[#2C97D4]/10 grid place-items-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-[#2C97D4]" />
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#2C97D4] grid place-items-center shrink-0 mt-0.5 text-[10px] font-bold text-white">
                    You
                  </div>
                )}

                {/* Bubble */}
                <div className={`max-w-[78%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#2C97D4] text-white rounded-tr-sm'
                    : msg.isError
                    ? 'bg-error/5 text-error rounded-tl-sm border border-error/20'
                    : 'bg-appbg text-textpri rounded-tl-sm border border-border'
                }`}>
                  {msg.text && <span>{msg.text}</span>}
                  {msg.intent && msg.intent !== 'unknown' && (
                    <span className="block text-[11px] text-textsec mb-1.5 font-semibold uppercase tracking-wider">
                      {msg.intent.replace(/_/g, ' ')}
                    </span>
                  )}
                  {msg.explanation && (
                    <p className="mt-1 mb-2 text-sm text-textpri leading-relaxed">{msg.explanation}</p>
                  )}
                  {msg.data !== undefined && (
                    Array.isArray(msg.data) ? (
                      msg.data.length === 0 ? (
                        <p className="mt-1 text-xs text-textsec italic">No records found.</p>
                      ) : (
                        <div className="mt-1.5 overflow-x-auto rounded-lg border border-border">
                          <table className="text-xs border-collapse w-full">
                            <thead>
                              <tr className="bg-appbg">
                                {Object.keys(msg.data[0]).map((col) => (
                                  <th key={col} className="text-left px-2.5 py-1.5 border-b border-border font-semibold text-textpri capitalize whitespace-nowrap">
                                    {col.replace(/([A-Z])/g, ' $1').trim()}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {msg.data.map((row, i) => (
                                <tr key={i} className={i % 2 === 0 ? 'bg-surface' : 'bg-appbg'}>
                                  {Object.values(row).map((val, j) => (
                                    <td key={j} className="px-2.5 py-1.5 border-b border-border text-textsec whitespace-nowrap last:border-b-0">
                                      {val instanceof Date
                                        ? new Date(val).toLocaleDateString()
                                        : typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(val)
                                        ? new Date(val).toLocaleDateString()
                                        : String(val ?? '—')}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )
                    ) : typeof msg.data === 'string' ? (
                      <p className="mt-1 text-xs text-textsec italic">{msg.data}</p>
                    ) : (
                      <pre className="mt-1 text-xs overflow-x-auto whitespace-pre-wrap break-words">{JSON.stringify(msg.data, null, 2)}</pre>
                    )
                  )}
                </div>
              </div>
            ))}
            {/* Loading indicator */}
            {loading && (
              <div className="flex gap-2 flex-row">
                <div className="w-7 h-7 rounded-full bg-[#2C97D4]/10 grid place-items-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-[#2C97D4]" />
                </div>
                <div className="rounded-xl px-3.5 py-2.5 text-sm bg-appbg text-textsec border border-border rounded-tl-sm">
                  Thinking…
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-border p-3 bg-surface">
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask something about your project…"
                rows={1}
                className="flex-1 resize-none rounded-lg border border-border bg-appbg px-3.5 py-2.5 text-sm text-textpri placeholder:text-texttert focus:outline-none focus:ring-2 focus:ring-[#2C97D4]/20 focus:border-[#2C97D4]/40 transition-all overflow-hidden"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                aria-label="Send message"
                className="shrink-0 w-9 h-9 rounded-lg bg-[#2C97D4] text-white grid place-items-center hover:bg-[#2286be] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <SendHorizontal className="w-4 h-4" />
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-texttert text-center select-none">
              <kbd className="px-1 py-0.5 rounded text-[10px] border border-border bg-appbg font-mono">Enter</kbd> to send ·{' '}
              <kbd className="px-1 py-0.5 rounded text-[10px] border border-border bg-appbg font-mono">Shift+Enter</kbd> for new line
            </p>
          </div>
        </div>

        {/* Right: context panel (desktop only) */}
        <div className="w-60 xl:w-64 shrink-0 hidden lg:flex flex-col gap-3">
          {/* Project context */}
          <div className="bg-surface rounded-xl border border-border shadow-card p-4">
            <h3 className="text-sm font-semibold text-textpri mb-2.5 flex items-center gap-2">
              <Info className="w-4 h-4 text-textsec" />
              Project Context
            </h3>
            <div className="space-y-1.5 text-xs text-textsec">
              <div className="flex items-center justify-between gap-2">
                <span>Project ID</span>
                <span className="font-mono text-textpri text-[11px] truncate max-w-[110px] bg-appbg px-2 py-0.5 rounded border border-border">
                  {projectId}
                </span>
              </div>
            </div>
          </div>

          {/* Suggested prompts */}
          <div className="bg-surface rounded-xl border border-border shadow-card p-4">
            <h3 className="text-sm font-semibold text-textpri mb-2.5 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-[#F59E0B]" />
              Suggested Prompts
            </h3>
            <div className="flex flex-col gap-1.5">
              {SUGGESTED_PROMPTS.map((hint) => (
                <button
                  key={hint}
                  onClick={() => setInput(hint)}
                  className="text-left text-xs px-3 py-2 rounded-lg border border-border hover:border-[#2C97D4]/30 hover:bg-[#2C97D4]/5 text-textsec hover:text-[#2C97D4] transition-all"
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
