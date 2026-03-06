import { useEffect, useState } from 'react';
import { MessageSquarePlus, Trash2 } from 'lucide-react';
import { aiApi } from '../../services/api';

export default function ThreadSidebar({ projectId, activeThreadId, onSelectThread, onNewChat }) {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadThreads = async () => {
    try {
      const data = await aiApi.listThreads(projectId);
      setThreads(data);
    } catch (err) {
      console.error('Failed to load threads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      setLoading(true);
      loadThreads();
    }
  }, [projectId]);

  // Reload when active thread changes (e.g., after a new thread is created or title updates)
  useEffect(() => {
    if (projectId) loadThreads();
  }, [activeThreadId]);

  const handleDelete = async (e, threadId) => {
    e.stopPropagation();
    if (!window.confirm('Delete this conversation?')) return;
    try {
      await aiApi.deleteThread(threadId);
      setThreads(prev => prev.filter(t => t._id !== threadId));
      if (activeThreadId === threadId) onNewChat();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const grouped = groupThreadsByDate(threads);

  return (
    <div className="w-64 border-r border-gray-200 bg-gray-50 flex flex-col h-full overflow-hidden shrink-0">
      {/* New Chat Button */}
      <div className="p-3 border-b border-gray-200">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-textpri hover:bg-gray-50 transition"
        >
          <MessageSquarePlus className="w-4 h-4" />
          New Chat
        </button>
      </div>

      {/* Thread List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-sm text-textsec">Loading...</div>
        ) : threads.length === 0 ? (
          <div className="p-4 text-sm text-textsec text-center">
            No conversations yet
          </div>
        ) : (
          Object.entries(grouped).map(([label, group]) => (
            <div key={label}>
              <div className="px-3 py-2 text-xs font-semibold text-textsec uppercase tracking-wide">
                {label}
              </div>
              {group.map(thread => (
                <div
                  key={thread._id}
                  onClick={() => onSelectThread(thread._id)}
                  className={`group flex items-center gap-2 px-3 py-2.5 mx-1 rounded-lg cursor-pointer text-sm transition ${
                    thread._id === activeThreadId
                      ? 'bg-white shadow-sm border border-gray-200 text-textpri font-medium'
                      : 'text-textsec hover:bg-white hover:text-textpri'
                  }`}
                >
                  <span className="flex-1 truncate">{thread.title}</span>
                  <button
                    onClick={(e) => handleDelete(e, thread._id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 hover:text-red-500 transition shrink-0"
                    title="Delete conversation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function groupThreadsByDate(threads) {
  const groups = {};
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  for (const thread of threads) {
    const threadDate = new Date(thread.lastMessageAt || thread.createdAt);

    let label;
    if (threadDate >= today) label = 'Today';
    else if (threadDate >= yesterday) label = 'Yesterday';
    else if (threadDate >= weekAgo) label = 'Last 7 Days';
    else label = 'Older';

    if (!groups[label]) groups[label] = [];
    groups[label].push(thread);
  }

  return groups;
}
