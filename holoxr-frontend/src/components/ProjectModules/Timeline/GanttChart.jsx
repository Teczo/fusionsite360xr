import { useMemo, useState } from 'react';

const DAY_MS = 1000 * 60 * 60 * 24;

function formatDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
}

function GanttTooltip({ item, position }) {
  if (!item) return null;

  return (
    <div
      className="pointer-events-none fixed z-50 rounded-lg border border-border bg-surface px-3 py-2 shadow-md text-xs"
      style={{ left: position.x + 12, top: position.y - 10 }}
    >
      <p className="font-semibold text-textpri mb-1">{item.name}</p>
      <p className="text-textsec">Start: {formatDate(item.start)}</p>
      <p className="text-textsec">Finish: {formatDate(item.end)}</p>
      <p className="text-textsec">Duration: {item.durationDays} days</p>
      {item.critical && <p className="text-error font-medium mt-1">Critical Path</p>}
    </div>
  );
}

export default function GanttChart({ data }) {
  const [tooltip, setTooltip] = useState({ item: null, position: { x: 0, y: 0 } });

  const chartData = useMemo(() => {
    if (!data?.length) return { items: [], ticks: [] };

    let minDate = Infinity;
    let maxDate = -Infinity;

    const items = data
      .map((task) => {
        const start = new Date(task.plannedStart).getTime();
        const end = new Date(task.plannedFinish).getTime();

        if (isNaN(start) || isNaN(end)) return null;

        const duration = Math.max(end - start, DAY_MS);

        if (start < minDate) minDate = start;
        if (start + duration > maxDate) maxDate = start + duration;

        return {
          name: task.name || task.activityId || 'Unnamed',
          start,
          end: start + duration,
          duration,
          durationDays: Math.max(1, Math.round(duration / DAY_MS)),
          critical: !!task.criticalPath,
        };
      })
      .filter(Boolean);

    if (!isFinite(minDate) || !isFinite(maxDate) || items.length === 0) {
      return { items: [], ticks: [] };
    }

    // Add padding
    const range = maxDate - minDate;
    const padding = range * 0.03 || DAY_MS * 3;
    const domainMin = minDate - padding;
    const domainMax = maxDate + padding;
    const domainRange = domainMax - domainMin;

    // Compute percentage positions
    const positioned = items.map((item) => ({
      ...item,
      leftPct: ((item.start - domainMin) / domainRange) * 100,
      widthPct: Math.max((item.duration / domainRange) * 100, 1), // min 1% width so bars are visible
    }));

    // Generate ~6 evenly-spaced time ticks
    const tickCount = 6;
    const ticks = [];
    for (let i = 0; i <= tickCount; i++) {
      const ts = domainMin + (domainRange * i) / tickCount;
      ticks.push({ ts, leftPct: (i / tickCount) * 100 });
    }

    return { items: positioned, ticks };
  }, [data]);

  if (!chartData.items.length) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-texttert">
        No schedule data to display
      </div>
    );
  }

  const ROW_HEIGHT = 32;
  const LABEL_WIDTH = 160;

  return (
    <div className="w-full overflow-x-auto">
      {/* Chart body */}
      <div className="flex" style={{ minWidth: 600 }}>
        {/* Y-axis labels */}
        <div className="flex-shrink-0" style={{ width: LABEL_WIDTH }}>
          {chartData.items.map((item, i) => (
            <div
              key={i}
              className="flex items-center pr-2 text-[11px] text-textpri truncate"
              style={{ height: ROW_HEIGHT }}
              title={item.name}
            >
              {item.name}
            </div>
          ))}
        </div>

        {/* Bar area */}
        <div className="flex-1 relative">
          {/* Grid lines */}
          {chartData.ticks.map((tick, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 border-l border-borderlight"
              style={{ left: `${tick.leftPct}%` }}
            />
          ))}

          {/* Rows */}
          {chartData.items.map((item, i) => (
            <div key={i} className="relative flex items-center" style={{ height: ROW_HEIGHT }}>
              <div
                className="absolute rounded"
                style={{
                  left: `${item.leftPct}%`,
                  width: `${item.widthPct}%`,
                  height: 18,
                  backgroundColor: item.critical ? '#EF4444' : '#2563EB',
                  opacity: 0.85,
                  cursor: 'default',
                }}
                onMouseEnter={(e) => setTooltip({ item, position: { x: e.clientX, y: e.clientY } })}
                onMouseMove={(e) => setTooltip((prev) => ({ ...prev, position: { x: e.clientX, y: e.clientY } }))}
                onMouseLeave={() => setTooltip({ item: null, position: { x: 0, y: 0 } })}
              />
            </div>
          ))}
        </div>
      </div>

      {/* X-axis ticks */}
      <div className="flex" style={{ minWidth: 600 }}>
        <div style={{ width: LABEL_WIDTH }} className="flex-shrink-0" />
        <div className="flex-1 relative" style={{ height: 24 }}>
          {chartData.ticks.map((tick, i) => (
            <span
              key={i}
              className="absolute text-[10px] text-texttert -translate-x-1/2"
              style={{ left: `${tick.leftPct}%`, top: 4 }}
            >
              {formatDate(tick.ts)}
            </span>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-3 text-xs text-textsec">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-accent" />
          Normal
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-[#EF4444]" />
          Critical Path
        </span>
      </div>

      {/* Tooltip */}
      <GanttTooltip item={tooltip.item} position={tooltip.position} />
    </div>
  );
}
