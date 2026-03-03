// Calendar view for timeline items (manual milestones/events)
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const TYPE_COLORS = {
  milestone: { bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' },
  incident: { bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444' },
  progress_update: { bg: '#ECFDF5', text: '#065F46', dot: '#10B981' },
  task: { bg: '#EFF6FF', text: '#1E40AF', dot: '#3B82F6' },
};

function getTypeColor(type) {
  return TYPE_COLORS[type] || TYPE_COLORS.task;
}

export default function TimelineCalendar({ items = [], scheduleData = [] }) {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());

  // Build events map: dateKey -> array of events
  const eventsMap = useMemo(() => {
    const map = {};

    // Manual timeline items
    items.forEach((item) => {
      const d = new Date(item.date);
      if (isNaN(d)) return;
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push({ label: item.title, type: item.type || 'task', source: 'manual' });
    });

    // Schedule milestones (tasks that start this month)
    scheduleData.forEach((task) => {
      const d = new Date(task.plannedStart);
      if (isNaN(d)) return;
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push({ label: task.name || task.activityId || 'Task', type: 'task', source: 'schedule' });
    });

    return map;
  }, [items, scheduleData]);

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Build calendar grid
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const cells = [];
  // Leading empty cells
  for (let i = 0; i < firstDay; i++) cells.push(null);
  // Day cells
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isToday = (d) =>
    d === today.getDate() &&
    currentMonth === today.getMonth() &&
    currentYear === today.getFullYear();

  return (
    <div className="overflow-hidden">
      {/* Calendar header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <button
          onClick={prevMonth}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition text-[#6B7280]"
        >
          <ChevronLeft size={18} />
        </button>
        <h3 className="text-base font-semibold text-[#111827]">
          {MONTHS[currentMonth]} {currentYear}
        </h3>
        <button
          onClick={nextMonth}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition text-[#6B7280]"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {DAYS.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-semibold text-[#9CA3AF]">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          if (!day) {
            return <div key={`empty-${idx}`} className="border-b border-r border-gray-50 min-h-[80px]" />;
          }
          const key = `${currentYear}-${currentMonth}-${day}`;
          const dayEvents = eventsMap[key] || [];
          const isWeekend = (firstDay + day - 1) % 7 === 0 || (firstDay + day - 1) % 7 === 6;

          return (
            <div
              key={key}
              className={`border-b border-r border-gray-50 min-h-[80px] p-1.5 ${
                isWeekend ? 'bg-gray-50/50' : 'bg-white'
              }`}
            >
              {/* Day number */}
              <div className="mb-1">
                <span
                  className={`inline-flex items-center justify-center w-6 h-6 text-xs font-semibold rounded-full ${
                    isToday(day)
                      ? 'bg-[#3BB2A5] text-white'
                      : 'text-[#374151]'
                  }`}
                >
                  {day}
                </span>
              </div>

              {/* Events */}
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((ev, i) => {
                  const colors = getTypeColor(ev.type);
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium truncate cursor-default"
                      style={{ backgroundColor: colors.bg, color: colors.text }}
                      title={ev.label}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: colors.dot }}
                      />
                      <span className="truncate">{ev.label}</span>
                    </div>
                  );
                })}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-[#9CA3AF] pl-1">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-5 py-3 border-t border-gray-100">
        {Object.entries(TYPE_COLORS).map(([type, colors]) => (
          <span key={type} className="flex items-center gap-1.5 text-xs text-[#6B7280]">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.dot }} />
            {type.replace('_', ' ')}
          </span>
        ))}
      </div>
    </div>
  );
}