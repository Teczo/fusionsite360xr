// Progress overview bar for schedule data — shows health breakdown + stats

function getHealth(task) {
  const now = Date.now();
  const end = new Date(task.plannedFinish).getTime();
  const start = new Date(task.plannedStart).getTime();
  const pct = Number(task.percentComplete ?? task.progress ?? 0);

  if (pct >= 100) return 'completed';
  if (isNaN(end) || isNaN(start)) return 'not_started';
  if (now > end && pct < 100) return 'delayed';
  if (pct > 0) return 'in_progress';
  return 'not_started';
}

const HEALTH_CFG = {
  completed: { label: 'Completed', color: '#059669', bg: '#ECFDF5', text: '#065F46' },
  in_progress: { label: 'In Progress', color: '#3BB2A5', bg: '#F0FDFB', text: '#134E4A' },
  delayed: { label: 'Delayed', color: '#DC2626', bg: '#FEF2F2', text: '#991B1B' },
  not_started: { label: 'Not Started', color: '#9CA3AF', bg: '#F9FAFB', text: '#4B5563' },
};

export default function TimelineProgressBar({ data }) {
  if (!data || data.length === 0) return null;

  const total = data.length;
  const counts = { completed: 0, in_progress: 0, delayed: 0, not_started: 0 };
  data.forEach((t) => counts[getHealth(t)]++);

  // Overall average progress
  const avgPct = Math.round(
    data.reduce((sum, t) => sum + Number(t.percentComplete ?? t.progress ?? 0), 0) / total
  );

  const criticalCount = data.filter((t) => t.criticalPath).length;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-5 mb-5">
      {/* Top row: title + overall % */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-sm font-semibold text-[#111827]">Schedule Progress</h4>
          <p className="text-xs text-[#6B7280]">{total} tasks total{criticalCount > 0 ? ` · ${criticalCount} critical` : ''}</p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-[#3BB2A5]">{avgPct}%</span>
          <p className="text-xs text-[#9CA3AF]">avg completion</p>
        </div>
      </div>

      {/* Segmented progress bar */}
      <div className="h-3 rounded-full overflow-hidden flex mb-4 gap-0.5">
        {Object.entries(counts).map(([key, count]) => {
          if (count === 0) return null;
          const cfg = HEALTH_CFG[key];
          return (
            <div
              key={key}
              title={`${cfg.label}: ${count}`}
              className="h-full rounded-full transition-all"
              style={{ width: `${(count / total) * 100}%`, backgroundColor: cfg.color }}
            />
          );
        })}
      </div>

      {/* Stats chips */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(HEALTH_CFG).map(([key, cfg]) => {
          const count = counts[key];
          return (
            <div
              key={key}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ backgroundColor: cfg.bg, color: cfg.text }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: cfg.color }}
              />
              {cfg.label}
              <span className="font-bold ml-0.5">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}