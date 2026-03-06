export default function SuggestedFollowUps({ suggestions, onSelect }) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {suggestions.map((suggestion, i) => (
        <button
          key={i}
          onClick={() => onSelect(suggestion)}
          className="text-xs px-3 py-1.5 rounded-full border border-brand/30 text-brand bg-brand/5 hover:bg-brand/10 hover:border-brand/50 transition cursor-pointer text-left"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}
