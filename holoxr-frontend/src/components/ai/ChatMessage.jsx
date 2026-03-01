import { Bot } from 'lucide-react';
import FeedbackButtons from './FeedbackButtons';

export default function ChatMessage({ role, content, data, intent, provider, auditLogId, isLoading, isError }) {
  if (role === 'user') {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[75%] bg-brand text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed">
          {content}
        </div>
      </div>
    );
  }

  // AI message
  return (
    <div className="flex gap-3 mb-4">
      <div className="w-8 h-8 rounded-full bg-brand/10 grid place-items-center shrink-0 mt-0.5">
        <Bot className="w-4 h-4 text-brand" />
      </div>
      <div className="flex-1 min-w-0">
        <div
          className={`inline-block max-w-[75%] rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed ${isError
              ? 'bg-red-50 text-red-700 border border-red-100'
              : 'bg-gray-50 text-textpri border border-gray-100'
            }`}
        >
          {isLoading ? (
            <div className="flex gap-1 items-center h-4">
              <span className="w-2 h-2 bg-textsec rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-textsec rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-textsec rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          ) : (
            <>
              {intent && intent !== 'unknown' && (
                <span className="block text-xs text-textsec mb-2 font-medium uppercase tracking-wide">
                  {intent.replace(/_/g, ' ')}
                </span>
              )}
              {content && <p>{content}</p>}
              {data != null && <DataDisplay data={data} />}
            </>
          )}
        </div>

        {!isLoading && (
          <div className="flex items-center gap-2 mt-1 ml-1">
            {provider && (
              <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-textsec rounded-full font-medium">
                {provider === 'claude'
                  ? 'Claude'
                  : provider === 'openai'
                    ? 'OpenAI'
                    : provider === 'azure-openai'
                      ? 'Azure OpenAI'
                      : provider}
              </span>
            )}
            {auditLogId && <FeedbackButtons auditLogId={auditLogId} />}
          </div>
        )}
      </div>
    </div>
  );
}

function DataDisplay({ data }) {
  if (!data) return null;
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <p className="mt-1 text-xs text-textsec italic">No records found.</p>;
    }
    return (
      <div className="mt-2 overflow-x-auto">
        <table className="text-xs border-collapse w-full">
          <thead>
            <tr>
              {Object.keys(data[0]).map((col) => (
                <th
                  key={col}
                  className="text-left px-2 py-1 bg-gray-100 border border-gray-200 font-semibold text-textpri capitalize whitespace-nowrap"
                >
                  {col.replace(/([A-Z])/g, ' $1').trim()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {Object.values(row).map((val, j) => (
                  <td key={j} className="px-2 py-1 border border-gray-200 text-textsec whitespace-nowrap">
                    {typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(val)
                      ? new Date(val).toLocaleDateString()
                      : String(val ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (typeof data === 'string') {
    return <p className="mt-1 text-xs text-textsec italic">{data}</p>;
  }

  return (
    <details className="mt-2">
      <summary className="text-xs text-textsec cursor-pointer hover:text-textpri select-none">
        View raw data {typeof data === 'object' ? `(${Object.keys(data).length} fields)` : ''}
      </summary>
      <pre className="mt-1 text-xs overflow-x-auto whitespace-pre-wrap break-words max-h-48 bg-white p-2 rounded border border-gray-200">
        {JSON.stringify(data, null, 2)}
      </pre>
    </details>
  );
}
