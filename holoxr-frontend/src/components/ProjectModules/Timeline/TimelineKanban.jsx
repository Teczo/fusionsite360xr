// Kanban board view for timeline tasks (schedule data)
// Columns: Not Started | In Progress | Completed | Delayed

const COLUMNS = [
  { key: 'not_started', label: 'Not Started', color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB' },
  { key: 'in_progress', label: 'In Progress', color: '#3BB2A5', bg: '#F0FDFB', border: '#99F6E4' },
  { key: 'completed',   label: 'Completed',   color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  { key: 'delayed',     label: 'Delayed',     color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
];

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

function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function TaskCard({ task }) {
  const health = getHealth(task);
  const col = COLUMNS.find((c) => c.key === health) || COLUMNS[0];
  const pct = Number(task.percentComplete ?? task.progress ?? 0);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-3 mb-2 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-sm font-semibold text-[#111827] leading-snug line-clamp-2">
          {task.name || task.activityId || 'Unnamed Task'}
        </span>
        {task.criticalPath && (
          <span className="shrink-0 text-[10px] font-semibold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">
            Critical
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-2">
        <div className="flex justify-between text-[10px] text-[#9CA3AF] mb-1">
          <span>Progress</span>
          <span className="font-semibold" style={{ color: col.color }}>{pct}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: col.color }}
          />
        </div>
      </div>

      {/* Dates + zone */}
      <div className="flex items-center justify-between text-[10px] text-[#9CA3AF]">
        <span>{fmt(task.plannedStart)} → {fmt(task.plannedFinish)}</span>
        {task.zone && (
          <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full truncate max-w-[80px]">
            {task.zone}
          </span>
        )}
      </div>
    </div>
  );
}

export default function TimelineKanban({ data }) {
  const grouped = COLUMNS.reduce((acc, col) => {
    acc[col.key] = [];
    return acc;
  }, {});

  (data || []).forEach((task) => {
    const h = getHealth(task);
    if (grouped[h]) grouped[h].push(task);
  });

  const isEmpty = !data || data.length === 0;

  return (
    <div className="p-5">
      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-10 gap-1 mb-4">
          <p className="text-sm font-medium text-[#9CA3AF]">No schedule data</p>
          <p className="text-xs text-[#D1D5DB]">Upload a CSV to populate the Kanban board</p>
        </div>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map((col) => {
          const tasks = grouped[col.key] || [];
          return (
            <div key={col.key} className="flex flex-col">
              {/* Column header */}
              <div
                className="flex items-center justify-between px-3 py-2.5 rounded-t-xl border"
                style={{ backgroundColor: col.bg, borderColor: col.border }}
              >
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: col.color }}>
                  {col.label}
                </span>
                <span
                  className="text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full text-white text-[11px]"
                  style={{ backgroundColor: col.color }}
                >
                  {tasks.length}
                </span>
              </div>

              {/* Cards area */}
              <div
                className="flex-1 min-h-[160px] max-h-[420px] p-2 rounded-b-xl border border-t-0 overflow-y-auto"
                style={{ borderColor: col.border, backgroundColor: col.bg + '60' }}
              >
                {tasks.length === 0 ? (
                  <div className="flex items-center justify-center h-14 text-xs text-[#D1D5DB]">
                    No tasks
                  </div>
                ) : (
                  tasks.map((task, i) => <TaskCard key={task._id || task.activityId || i} task={task} />)
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}