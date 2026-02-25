import { Database, Filter, Scissors, Layers, Ruler } from 'lucide-react';

const TOOLS = [
  { id: 'bim', icon: Database, label: 'BIM Data', disabled: false },
  { id: 'measure', icon: Ruler, label: 'Measure', disabled: false }, // NEW
  { id: 'filter', icon: Filter, label: 'Filter', disabled: true },
  { id: 'section', icon: Scissors, label: 'Cross-Section', disabled: true },
  { id: 'isolate', icon: Layers, label: 'Isolate', disabled: true },
];

export default function TwinToolbar({ activeTool, onToolChange }) {
  const handleClick = (tool) => {
    if (tool.disabled) return;
    onToolChange(activeTool === tool.id ? null : tool.id);
  };

  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-black/50 backdrop-blur-sm border border-white/10 rounded-2xl px-3 py-2">
      {TOOLS.map((tool) => {
        const Icon = tool.icon;
        const isActive = activeTool === tool.id;

        return (
          <button
            key={tool.id}
            onClick={() => handleClick(tool)}
            disabled={tool.disabled}
            title={tool.label}
            className={[
              'flex items-center justify-center w-9 h-9 rounded-xl transition-all',
              tool.disabled
                ? 'opacity-40 cursor-not-allowed text-white/50'
                : isActive
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/10',
            ].join(' ')}
            aria-pressed={isActive}
            aria-label={tool.label}
          >
            <Icon className="w-4 h-4" />
          </button>
        );
      })}
    </div>
  );
}
