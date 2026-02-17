import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const DAY_MS = 1000 * 60 * 60 * 24;

function formatDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  return (
    <div className="rounded-lg border border-[#E6EAF0] bg-white px-3 py-2 shadow-md text-xs">
      <p className="font-semibold text-[#111827] mb-1">{d.name}</p>
      <p className="text-[#6B7280]">Start: {formatDate(d.start)}</p>
      <p className="text-[#6B7280]">Finish: {formatDate(d.start + d.duration)}</p>
      <p className="text-[#6B7280]">Duration: {Math.round(d.duration / DAY_MS)} days</p>
      {d.critical && <p className="text-[#EF4444] font-medium mt-1">Critical Path</p>}
    </div>
  );
}

export default function GanttChart({ data }) {
  const chartData = useMemo(() => {
    if (!data?.length) return { items: [], minDate: 0, maxDate: 0 };

    let minDate = Infinity;
    let maxDate = -Infinity;

    const items = data.map((task) => {
      const start = new Date(task.plannedStart).getTime();
      const end = new Date(task.plannedFinish).getTime();
      const duration = Math.max(end - start, DAY_MS); // minimum 1 day

      if (start < minDate) minDate = start;
      if (end > maxDate) maxDate = end;

      return {
        name: task.name || task.activityId,
        start,
        duration,
        critical: !!task.criticalPath,
      };
    });

    // Add padding to domain
    const padding = (maxDate - minDate) * 0.05 || DAY_MS * 7;
    return { items, minDate: minDate - padding, maxDate: maxDate + padding };
  }, [data]);

  if (!data?.length) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-[#9CA3AF]">
        No schedule data to display
      </div>
    );
  }

  const chartHeight = Math.max(300, chartData.items.length * 36 + 60);

  return (
    <div className="w-full overflow-x-auto">
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={chartData.items}
          layout="vertical"
          margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
          barSize={18}
        >
          <XAxis
            type="number"
            domain={[chartData.minDate, chartData.maxDate]}
            tickFormatter={formatDate}
            tick={{ fontSize: 11, fill: '#9CA3AF' }}
            axisLine={{ stroke: '#E6EAF0' }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={150}
            tick={{ fontSize: 11, fill: '#374151' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={false} />

          {/* Invisible offset bar to position the visible bar at the correct start */}
          <Bar dataKey="start" stackId="gantt" fill="transparent" isAnimationActive={false} />

          {/* Visible duration bar */}
          <Bar dataKey="duration" stackId="gantt" radius={[4, 4, 4, 4]} isAnimationActive={false}>
            {chartData.items.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.critical ? '#EF4444' : '#2563EB'}
                fillOpacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-2 text-xs text-[#6B7280]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-[#2563EB]" />
          Normal
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-[#EF4444]" />
          Critical Path
        </span>
      </div>
    </div>
  );
}
