const SUGGESTED_PROMPTS = [
  {
    icon: '⏰',
    title: 'Are there any overdue tasks?',
    subtitle: 'Schedule delays and slippage',
  },
  {
    icon: '💰',
    title: 'What is the cost breakdown by phase?',
    subtitle: 'Budget vs actual spending',
  },
  {
    icon: '🛡️',
    title: 'How many safety incidents this month?',
    subtitle: 'HSE incident tracking',
  },
  {
    icon: '📋',
    title: 'Show me the inspection reports',
    subtitle: 'Document search and retrieval',
  },
];

export default function SuggestedPrompts({ onSelect }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl w-full mx-auto mt-6">
      {SUGGESTED_PROMPTS.map((prompt) => (
        <button
          key={prompt.title}
          onClick={() => onSelect(prompt.title)}
          className="text-left p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-brand/40 hover:shadow-md transition-all group"
        >
          <span className="text-2xl mb-2 block">{prompt.icon}</span>
          <p className="text-sm font-medium text-textpri group-hover:text-brand transition-colors">
            {prompt.title}
          </p>
          <p className="text-xs text-textsec mt-0.5">{prompt.subtitle}</p>
        </button>
      ))}
    </div>
  );
}
