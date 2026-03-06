/**
 * GanttChart — FusionSite360 edition
 *
 * Adapted from Energy Studio Gantt with FusionSite data model:
 *   task.plannedStart / task.plannedFinish  — date strings
 *   task.name / task.activityId            — display name
 *   task.percentComplete / task.progress   — 0-100
 *   task.criticalPath                      — boolean
 *   task.zone                              — optional zone label
 *   task.status                            — optional override ('completed'|'in-progress'|'blocked'|'pending')
 *
 * No dark mode. No external TaskDetailPanel dependency.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  Diamond,
  MapPin,
  Search,
  X,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────
const ROW_HEIGHT = 44;
const GROUP_ROW_HEIGHT = 48;
const HEADER_HEIGHT = 48;
const MIN_LEFT = 240;
const MAX_LEFT = 480;
const DAY_MS = 86_400_000;

// FusionSite brand palette (no dark mode)
const STATUS_COLORS = {
  completed:    { bar: '#059669', bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' },
  'in-progress':{ bar: '#3BB2A5', bg: '#F0FDFB', text: '#134E4A', border: '#99F6E4' },
  pending:      { bar: '#6B7280', bg: '#F9FAFB', text: '#374151', border: '#D1D5DB' },
  blocked:      { bar: '#DC2626', bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' },
  critical:     { bar: '#EF4444', bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' },
};

// Group color palette — distinct hues per WBS group (Energy Studio style)
const GROUP_PALETTE = [
  { bar: '#3B82F6', bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE' }, // blue
  { bar: '#8B5CF6', bg: '#F5F3FF', text: '#5B21B6', border: '#DDD6FE' }, // purple
  { bar: '#F59E0B', bg: '#FFFBEB', text: '#92400E', border: '#FDE68A' }, // amber
  { bar: '#EC4899', bg: '#FDF2F8', text: '#9D174D', border: '#FBCFE8' }, // pink
  { bar: '#14B8A6', bg: '#F0FDFA', text: '#134E4A', border: '#99F6E4' }, // teal
  { bar: '#F97316', bg: '#FFF7ED', text: '#9A3412', border: '#FED7AA' }, // orange
  { bar: '#6366F1', bg: '#EEF2FF', text: '#3730A3', border: '#C7D2FE' }, // indigo
  { bar: '#10B981', bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' }, // emerald
];

// ─── Date helpers ─────────────────────────────────────────────────────────────
function startOfDay(d) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}
function addDays(d, n) { return new Date(d.getTime() + n * DAY_MS); }
function diffDays(a, b) { return Math.round((b.getTime() - a.getTime()) / DAY_MS); }
function fmtShort(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function fmtFull(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function getMonthStart(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function getMonday(d) {
  const dt = new Date(d);
  const day = dt.getDay();
  dt.setDate(dt.getDate() - day + (day === 0 ? -6 : 1));
  dt.setHours(0, 0, 0, 0);
  return dt;
}

// ─── Health from FusionSite data ──────────────────────────────────────────────
function deriveStatus(task) {
  if (task.status) return task.status; // explicit override
  const now = Date.now();
  const end = new Date(task.plannedFinish).getTime();
  const pct = Number(task.percentComplete ?? task.progress ?? 0);
  if (pct >= 100) return 'completed';
  if (task.criticalPath && now > end) return 'blocked';
  if (task.criticalPath) return 'critical';
  if (now > end && pct < 100) return 'blocked';
  if (pct > 0) return 'in-progress';
  return 'pending';
}

// ─── Normalise a single raw row ───────────────────────────────────────────────
function normaliseTask(raw, index, groupColor) {
  const start = new Date(raw.plannedStart);
  const end = new Date(raw.plannedFinish);
  const validStart = !isNaN(start);
  const validEnd = !isNaN(end);
  const type = (raw.type || 'task').toLowerCase(); // 'group'|'task'|'subtask'|'milestone'

  return {
    id: raw._id || raw.activityId || `task-${index}`,
    name: raw.name || raw.activityId || `Task ${index + 1}`,
    start: validStart ? start : new Date(),
    end: validEnd ? end : validStart ? addDays(start, 1) : addDays(new Date(), 1),
    progress: Math.min(100, Math.max(0, Number(raw.percentComplete ?? raw.progress ?? 0))),
    criticalPath: !!raw.criticalPath,
    zone: raw.zone || null,
    status: deriveStatus(raw),
    type: type === 'milestone' ? 'milestone' : type === 'group' ? 'group' : type === 'subtask' ? 'subtask' : 'task',
    children: [],
    assignee: raw.assignee || null,
    group: raw.group || null,
    parentActivityId: raw.parentActivityId || raw.parent_activity_id || null,
    groupColor: groupColor || null, // palette color for this task's group
    _raw: raw,
  };
}

// ─── Build group→task/subtask hierarchy from flat rows ───────────────────────
function buildHierarchy(rawRows) {
  if (!rawRows.length) return [];

  // Assign a stable group color index
  const groupNames = [];
  rawRows.forEach((r) => {
    const g = r.group || null;
    if (g && !groupNames.includes(g)) groupNames.push(g);
  });
  const groupColorMap = {};
  groupNames.forEach((g, i) => { groupColorMap[g] = GROUP_PALETTE[i % GROUP_PALETTE.length]; });

  // If no rows have a group field, fall back to flat list
  const hasGroups = groupNames.length > 0;
  if (!hasGroups) {
    return rawRows.map((r, i) => normaliseTask(r, i, null));
  }

  // Build flat normalised tasks with group colors
  // Keep two maps: by MongoDB _id AND by activityId, since parentActivityId stores the activityId string
  const taskMapById = new Map();       // keyed by MongoDB _id
  const taskMapByActivityId = new Map(); // keyed by activityId (e.g. "A001")
  const normalised = rawRows.map((r, i) => {
    const gc = r.group ? groupColorMap[r.group] : null;
    const t = normaliseTask(r, i, gc);
    taskMapById.set(t.id, t);
    if (r.activityId) taskMapByActivityId.set(r.activityId, t);
    return t;
  });

  // Resolve parentActivityId subtask nesting first
  // parentActivityId holds an activityId string (e.g. "A001"), so look up by activityId map
  const topLevel = [];
  normalised.forEach((t) => {
    if (t.parentActivityId) {
      const parent = taskMapByActivityId.get(t.parentActivityId)
                  || taskMapById.get(t.parentActivityId);
      if (parent && parent.id !== t.id) { parent.children.push(t); return; }
    }
    topLevel.push(t);
  });

  // Group top-level tasks under synthetic group nodes
  const groupNodes = new Map();
  const result = [];

  topLevel.forEach((t) => {
    if (t.type === 'group') { result.push(t); return; }
    const gName = t.group;
    if (!gName) { result.push(t); return; }

    if (!groupNodes.has(gName)) {
      const gc = groupColorMap[gName];
      const groupNode = {
        id: `group-${gName}`,
        name: gName,
        type: 'group',
        start: t.start,
        end: t.end,
        progress: 0,
        criticalPath: false,
        zone: null,
        status: 'pending',
        children: [],
        groupColor: gc,
        _synthetic: true,
      };
      groupNodes.set(gName, groupNode);
      result.push(groupNode);
    }
    groupNodes.get(gName).children.push(t);
  });

  // Recompute group spans and progress from children
  groupNodes.forEach((g) => {
    if (!g.children.length) return;
    g.start = g.children.reduce((m, c) => c.start < m ? c.start : m, g.children[0].start);
    g.end   = g.children.reduce((m, c) => c.end   > m ? c.end   : m, g.children[0].end);
    const totalPct = g.children.reduce((s, c) => s + (c.progress || 0), 0);
    g.progress = Math.round(totalPct / g.children.length);
  });

  return result;
}

// ─── Flatten nested tasks for rendering ──────────────────────────────────────
function flattenTasks(tasks, expandedIds, depth = 0) {
  const rows = [];
  tasks.forEach((t) => {
    rows.push({ ...t, _depth: depth });
    if (t.children?.length && expandedIds.has(t.id)) {
      rows.push(...flattenTasks(t.children, expandedIds, depth + 1));
    }
  });
  return rows;
}

// ─── Detail drawer ────────────────────────────────────────────────────────────
function TaskDetailDrawer({ task, onClose }) {
  const colors = STATUS_COLORS[task.status] || STATUS_COLORS.pending;
  const pct = task.progress;
  const duration = Math.max(1, diffDays(task.start, task.end));

  return (
    <div className="absolute right-0 top-0 bottom-0 w-72 bg-white border-l border-gray-100 shadow-xl z-40 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 px-4 py-3 border-b border-gray-100">
        <div className="min-w-0">
          <p className="text-xs text-[#9CA3AF] mb-0.5">Task Detail</p>
          <h4 className="text-sm font-semibold text-[#111827] leading-snug">{task.name}</h4>
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1.5 rounded-lg hover:bg-gray-100 text-[#6B7280] transition mt-0.5"
        >
          <X size={15} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Status badge */}
        <div>
          <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-1.5">Status</p>
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border"
            style={{ backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.bar }} />
            {task.status.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </span>
        </div>

        {/* Progress */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Progress</p>
            <span className="text-xs font-bold" style={{ color: colors.bar }}>{pct}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, backgroundColor: colors.bar }}
            />
          </div>
        </div>

        {/* Dates */}
        <div>
          <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-2">Schedule</p>
          <div className="space-y-1.5">
            {[
              { label: 'Start', value: fmtFull(task.start) },
              { label: 'Finish', value: fmtFull(task.end) },
              { label: 'Duration', value: `${duration} day${duration === 1 ? '' : 's'}` },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between text-xs">
                <span className="text-[#6B7280]">{label}</span>
                <span className="font-medium text-[#111827]">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Zone */}
        {task.zone && (
          <div>
            <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-1.5">Zone</p>
            <div className="flex items-center gap-1.5 text-xs text-[#374151]">
              <MapPin size={12} className="text-[#3BB2A5]" />
              {task.zone}
            </div>
          </div>
        )}

        {/* Critical path */}
        {task.criticalPath && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            Critical Path Task
          </div>
        )}

        {/* Assignee */}
        {task.assignee && (
          <div>
            <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-1.5">Assigned To</p>
            <div className="flex items-center gap-2 text-xs text-[#374151]">
              <span className="w-7 h-7 rounded-full bg-gradient-to-br from-[#3BB2A5] to-[#2563EB] flex items-center justify-center text-white font-bold text-[11px]">
                {String(task.assignee.name || task.assignee).charAt(0).toUpperCase()}
              </span>
              <span className="font-medium">{task.assignee.name || task.assignee}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Collect all IDs in a tree (for expand all) ──────────────────────────────
function collectIds(tasks) {
  const ids = new Set();
  const walk = (ts) => ts.forEach((t) => { ids.add(t.id); if (t.children?.length) walk(t.children); });
  walk(tasks);
  return ids;
}

// ─── Main GanttChart Component ────────────────────────────────────────────────
export default function GanttChart({ data = [] }) {
  // Build hierarchy from flat FusionSite schedule rows
  const tasks = useMemo(() => buildHierarchy(data), [data]);

  const [expandedIds, setExpandedIds] = useState(() => collectIds(tasks));
  const [leftWidth, setLeftWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const [detailTask, setDetailTask] = useState(null);
  const [zoom, setZoom] = useState('month');
  const [search, setSearch] = useState('');
  const [localTasks, setLocalTasks] = useState(tasks);

  // Sync when data prop changes
  useEffect(() => {
    const built = buildHierarchy(data);
    setLocalTasks(built);
    setExpandedIds(collectIds(built));
  }, [data]);

  const timelineScrollRef = useRef(null);
  const leftScrollRef = useRef(null);
  const headerRef = useRef(null);

  // ─── Zoom config ────────────────────────────────────────────────────────────
  const zoomCfg = useMemo(() => {
    if (zoom === 'day') return { cellWidth: 40 };
    if (zoom === 'week') return { cellWidth: 120 };
    return { cellWidth: 160 }; // month
  }, [zoom]);

  // ─── Timeline range + columns ───────────────────────────────────────────────
  const { timelineStart, totalDays, totalWidth, columns } = useMemo(() => {
    if (!localTasks.length) {
      const start = getMonthStart(new Date());
      const end = addDays(start, 60);
      const days = diffDays(start, end);
      return { timelineStart: start, timelineEnd: end, totalDays: days, totalWidth: zoomCfg.cellWidth * 2, columns: [] };
    }

    let earliest = localTasks[0].start;
    let latest = localTasks[0].end;
    localTasks.forEach((t) => {
      if (t.start < earliest) earliest = t.start;
      if (t.end > latest) latest = t.end;
    });

    const padStart = addDays(earliest, -14);
    const padEnd = addDays(latest, 30);
    const start = zoom === 'month' ? getMonthStart(padStart) : zoom === 'week' ? getMonday(padStart) : startOfDay(padStart);

    const cols = [];
    if (zoom === 'day') {
      for (let d = new Date(start); d < padEnd; d = addDays(d, 1)) {
        cols.push({
          date: new Date(d),
          label: d.getDate().toString(),
          width: zoomCfg.cellWidth,
          isToday: startOfDay(d).getTime() === startOfDay(new Date()).getTime(),
          isWeekend: d.getDay() === 0 || d.getDay() === 6,
        });
      }
    } else if (zoom === 'week') {
      for (let d = getMonday(start); d < padEnd; d = addDays(d, 7)) {
        const we = addDays(d, 6);
        cols.push({
          date: new Date(d),
          label: `${fmtShort(d)} – ${fmtShort(we)}`,
          width: zoomCfg.cellWidth,
          isToday: startOfDay(new Date()) >= startOfDay(d) && startOfDay(new Date()) <= startOfDay(we),
        });
      }
    } else {
      for (let d = getMonthStart(start); d < padEnd; ) {
        const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        const mDays = diffDays(d, next);
        cols.push({
          date: new Date(d),
          label: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          width: zoomCfg.cellWidth,
          isToday: d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear(),
          days: mDays,
        });
        d = next;
      }
    }

    const tw = cols.reduce((s, c) => s + c.width, 0);
    const days = diffDays(start, padEnd);

    return { timelineStart: start, totalDays: days, totalWidth: tw, columns: cols };
  }, [localTasks, zoom, zoomCfg]);

  // ─── Flat rows ──────────────────────────────────────────────────────────────
  const flatRows = useMemo(() => {
    let rows = flattenTasks(localTasks, expandedIds);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((r) => r.name.toLowerCase().includes(q));
    }
    return rows;
  }, [localTasks, expandedIds, search]);

  // ─── Position helpers ───────────────────────────────────────────────────────
  const getBarX = useCallback((date) => {
    const offset = diffDays(timelineStart, new Date(date));
    return (offset / totalDays) * totalWidth;
  }, [timelineStart, totalDays, totalWidth]);

  const getBarW = useCallback((s, e) => {
    const days = Math.max(1, diffDays(new Date(s), new Date(e)));
    return (days / totalDays) * totalWidth;
  }, [totalDays, totalWidth]);

  const todayX = useMemo(() => getBarX(new Date()), [getBarX]);

  // ─── Row height ─────────────────────────────────────────────────────────────
  const rowH = (row) => row.type === 'group' ? GROUP_ROW_HEIGHT : ROW_HEIGHT;

  const rowOffsets = useMemo(() => {
    const offsets = [];
    let y = 0;
    flatRows.forEach((r) => { offsets.push(y); y += rowH(r); });
    offsets.push(y);
    return offsets;
  }, [flatRows]);

  const totalBodyH = rowOffsets[rowOffsets.length - 1] || 0;

  // ─── Left panel resize ──────────────────────────────────────────────────────
  const onResizeStart = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startW = leftWidth;
    const onMove = (ev) => setLeftWidth(Math.max(MIN_LEFT, Math.min(MAX_LEFT, startW + ev.clientX - startX)));
    const onUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [leftWidth]);

  // ─── Bar drag ───────────────────────────────────────────────────────────────
  const onBarMouseDown = useCallback((e, row, mode) => {
    e.stopPropagation();
    if (row.type === 'milestone') return;
    const startX = e.clientX;
    const origStart = new Date(row.start);
    const origEnd = new Date(row.end);

    const onMove = (ev) => {
      const delta = Math.round(((ev.clientX - startX) / totalWidth) * totalDays);
      if (delta === 0) return;
      setDragging({ id: row.id, mode });
      setLocalTasks((prev) =>
        prev.map((t) => {
          if (t.id !== row.id) return t;
          let ns = new Date(origStart);
          let ne = new Date(origEnd);
          if (mode === 'move') { ns = addDays(origStart, delta); ne = addDays(origEnd, delta); }
          else if (mode === 'resize-right') { ne = addDays(origEnd, delta); if (ne <= ns) ne = addDays(ns, 1); }
          else { ns = addDays(origStart, delta); if (ns >= ne) ns = addDays(ne, -1); }
          return { ...t, start: ns, end: ne };
        })
      );
    };
    const onUp = () => {
      setDragging(null);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [totalWidth, totalDays]);

  // ─── Synchronized scroll ────────────────────────────────────────────────────
  const onTimelineScroll = useCallback((e) => {
    if (leftScrollRef.current) leftScrollRef.current.scrollTop = e.target.scrollTop;
    if (headerRef.current) headerRef.current.style.transform = `translateX(-${e.target.scrollLeft}px)`;
  }, []);

  // ─── Expand / collapse ──────────────────────────────────────────────────────
  const toggleExpand = useCallback((id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => setExpandedIds(collectIds(localTasks)), [localTasks]);

  const collapseAll = useCallback(() => setExpandedIds(new Set()), []);

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col bg-white border border-gray-100 rounded-xl overflow-hidden" style={{ minHeight: 420, maxHeight: 620 }}>

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Zoom switcher */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            {['day', 'week', 'month'].map((m) => (
              <button
                key={m}
                onClick={() => setZoom(m)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  zoom === m
                    ? 'bg-white text-[#111827] shadow-sm'
                    : 'text-[#6B7280] hover:text-[#374151]'
                }`}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
            <Search size={13} className="text-[#9CA3AF]" />
            <input
              type="text"
              placeholder="Search tasks…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent outline-none text-xs text-[#374151] placeholder:text-[#D1D5DB] w-36"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-[#9CA3AF] hover:text-[#6B7280]">
                <X size={11} />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={expandAll}
            className="px-2.5 py-1.5 text-xs font-medium text-[#6B7280] hover:bg-gray-100 rounded-lg transition"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="px-2.5 py-1.5 text-xs font-medium text-[#6B7280] hover:bg-gray-100 rounded-lg transition"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* ── Main body ── */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* ── Left panel ── */}
        <div
          className="flex-shrink-0 flex flex-col border-r border-gray-100 bg-white"
          style={{ width: leftWidth }}
        >
          {/* Left header */}
          <div
            className="flex items-center px-4 border-b border-gray-100 bg-gray-50 text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider flex-shrink-0"
            style={{ height: HEADER_HEIGHT }}
          >
            Task / Activity
          </div>

          {/* Left rows */}
          <div
            ref={leftScrollRef}
            className="flex-1 overflow-y-hidden overflow-x-hidden"
            style={{ scrollbarWidth: 'none' }}
          >
            <div style={{ height: Math.max(totalBodyH, 200) }}>
              {flatRows.map((row) => {
                const h = rowH(row);
                // depth 0 = group, depth 1 = task, depth 2 = subtask
                const depth = row._depth;
                const indent = depth === 0 ? 8 : depth === 1 ? 24 : 40;
                const hasChildren = row.children?.length > 0;
                const isExp = expandedIds.has(row.id);
                const isGroup = row.type === 'group';
                const isMilestone = row.type === 'milestone';
                const isSubtask = depth >= 2;
                const statusColors = STATUS_COLORS[row.status] || STATUS_COLORS.pending;
                const colors = row.groupColor && row.status !== 'completed' && row.status !== 'blocked'
                  ? row.groupColor
                  : statusColors;
                const isHov = hoveredId === row.id;
                const isSel = selectedId === row.id;

                return (
                  <div
                    key={row.id}
                    className={`flex items-center border-b transition-colors cursor-pointer select-none ${
                      isGroup
                        ? 'bg-[#F8F9FA] border-gray-100'
                        : isSel
                        ? 'bg-[#F0FDFB] border-[#CCFBF1]'
                        : isHov
                        ? 'bg-blue-50/30 border-gray-100'
                        : 'bg-white border-gray-50'
                    }`}
                    style={{ height: h, paddingLeft: indent }}
                    onMouseEnter={() => setHoveredId(row.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => { setSelectedId(row.id); setDetailTask(row); }}
                  >
                    {/* Expand toggle — shown for groups and collapsible tasks */}
                    {hasChildren ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleExpand(row.id); }}
                        className={`flex items-center justify-center rounded transition mr-1 flex-shrink-0 ${
                          isGroup
                            ? 'w-5 h-5 text-[#6B7280] hover:text-[#111827]'
                            : 'w-4 h-4 text-[#9CA3AF] hover:text-[#374151]'
                        }`}
                      >
                        {isExp
                          ? <ChevronDown size={isGroup ? 14 : 12} />
                          : <ChevronRight size={isGroup ? 14 : 12} />}
                      </button>
                    ) : (
                      <span className={`mr-1 flex-shrink-0 ${isGroup ? 'w-5' : 'w-4'}`} />
                    )}

                    {/* Milestone diamond */}
                    {isMilestone && (
                      <Diamond size={10} className="text-amber-500 mr-1.5 flex-shrink-0" fill="currentColor" />
                    )}

                    {/* Status dot — task (medium) or subtask (small) */}
                    {!isMilestone && !isGroup && (
                      <span
                        className={`rounded-full mr-2 flex-shrink-0 ${isSubtask ? 'w-1.5 h-1.5' : 'w-2 h-2'}`}
                        style={{ backgroundColor: colors.bar }}
                      />
                    )}

                    {/* Name */}
                    <span
                      className={`truncate ${
                        isGroup
                          ? 'text-xs font-bold text-[#111827]'
                          : isMilestone
                          ? 'text-xs font-semibold italic text-[#374151]'
                          : isSubtask
                          ? 'text-[11px] text-[#6B7280]'
                          : 'text-xs font-medium text-[#374151]'
                      }`}
                      title={row.name}
                    >
                      {row.name}
                    </span>

                    {/* Zone tag */}
                    {row.zone && !isGroup && !isSubtask && (
                      <span className="ml-auto mr-2 flex-shrink-0 text-[9px] font-medium text-[#9CA3AF] bg-gray-100 px-1.5 py-0.5 rounded-full truncate max-w-[56px]">
                        {row.zone}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Resize handle ── */}
        <div
          onMouseDown={onResizeStart}
          className={`w-1 cursor-col-resize flex-shrink-0 transition-colors ${
            isResizing ? 'bg-[#3BB2A5]' : 'bg-gray-100 hover:bg-[#3BB2A5]/40'
          }`}
        />

        {/* ── Timeline panel ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Timeline header */}
          <div
            className="flex border-b border-gray-100 bg-gray-50 overflow-hidden flex-shrink-0"
            style={{ height: HEADER_HEIGHT }}
          >
            <div ref={headerRef} className="flex" style={{ width: totalWidth }}>
              {columns.map((col, ci) => (
                <div
                  key={ci}
                  className={`flex-shrink-0 flex items-center justify-center text-[10px] font-semibold border-r border-gray-100 ${
                    col.isToday
                      ? 'text-[#3BB2A5] bg-[#F0FDFB]'
                      : 'text-[#9CA3AF]'
                  } ${col.isWeekend ? 'bg-gray-50/60' : ''}`}
                  style={{ width: col.width }}
                >
                  {col.label}
                </div>
              ))}
            </div>
          </div>

          {/* Timeline body */}
          <div
            ref={timelineScrollRef}
            className="flex-1 overflow-auto"
            onScroll={onTimelineScroll}
          >
            <div style={{ width: totalWidth, height: Math.max(totalBodyH, 200), position: 'relative' }}>

              {/* ── Grid ── */}
              <svg
                width={totalWidth}
                height={totalBodyH}
                className="absolute inset-0 pointer-events-none"
              >
                {/* Column lines */}
                {columns.reduce((acc, col, ci) => {
                  const x = columns.slice(0, ci).reduce((s, c) => s + c.width, 0);
                  if (col.isWeekend) {
                    acc.push(
                      <rect key={`wknd-${ci}`} x={x} y={0} width={col.width} height={totalBodyH} fill="#F9FAFB" opacity={0.6} />
                    );
                  }
                  acc.push(
                    <line key={`col-${ci}`} x1={x} y1={0} x2={x} y2={totalBodyH} stroke="#F3F4F6" strokeWidth={1} />
                  );
                  return acc;
                }, [])}

                {/* Row lines */}
                {flatRows.map((row, idx) => (
                  <line
                    key={`row-${row.id}`}
                    x1={0} y1={rowOffsets[idx] + rowH(row)}
                    x2={totalWidth} y2={rowOffsets[idx] + rowH(row)}
                    stroke="#F9FAFB" strokeWidth={1}
                  />
                ))}

                {/* Group row fill */}
                {flatRows.map((row, idx) =>
                  row.type === 'group' ? (
                    <rect
                      key={`grp-${row.id}`}
                      x={0} y={rowOffsets[idx]}
                      width={totalWidth} height={rowH(row)}
                      fill="#F9FAFB" opacity={0.7}
                    />
                  ) : null
                )}

                {/* Hover row fill */}
                {flatRows.map((row, idx) =>
                  hoveredId === row.id && row.type !== 'group' ? (
                    <rect
                      key={`hov-${row.id}`}
                      x={0} y={rowOffsets[idx]}
                      width={totalWidth} height={rowH(row)}
                      fill="#F0FDFB" opacity={0.5}
                    />
                  ) : null
                )}

                {/* Today line */}
                {todayX > 0 && todayX < totalWidth && (
                  <>
                    <line x1={todayX} y1={0} x2={todayX} y2={totalBodyH} stroke="#3BB2A5" strokeWidth={1.5} strokeDasharray="4 3" />
                    <rect x={todayX - 20} y={2} width={40} height={16} rx={4} fill="#3BB2A5" />
                    <text x={todayX} y={14} textAnchor="middle" fontSize={9} fontWeight="700" fill="white">Today</text>
                  </>
                )}
              </svg>

              {/* ── Empty state overlay ── */}
              {flatRows.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
                  <p className="text-sm font-medium text-[#9CA3AF]">No schedule data to display</p>
                  <p className="text-xs text-[#D1D5DB]">Upload a schedule CSV to populate the Gantt chart</p>
                </div>
              )}

              {/* ── Bars ── */}
              {flatRows.map((row, idx) => {
                const y = rowOffsets[idx];
                const h = rowH(row);
                const bx = getBarX(row.start);
                const bw = getBarW(row.start, row.end);
                // Use group palette color when available (overrides status color for non-completed/blocked tasks)
                const statusColors = STATUS_COLORS[row.status] || STATUS_COLORS.pending;
                const colors = row.groupColor && row.status !== 'completed' && row.status !== 'blocked'
                  ? row.groupColor
                  : statusColors;
                const isHov = hoveredId === row.id;
                const isDrag = dragging?.id === row.id;
                const pct = row.progress;

                // Milestone — rotated square
                if (row.type === 'milestone') {
                  const cx = bx;
                  const cy = y + h / 2;
                  const s = 13;
                  return (
                    <div
                      key={row.id}
                      className="absolute cursor-pointer"
                      style={{
                        left: cx - s / 2, top: cy - s / 2,
                        width: s, height: s,
                        transform: 'rotate(45deg)',
                        backgroundColor: colors.bar,
                        borderRadius: 2,
                        boxShadow: isHov ? '0 2px 8px rgba(0,0,0,0.18)' : '0 1px 3px rgba(0,0,0,0.08)',
                        zIndex: 10,
                      }}
                      onMouseEnter={() => { setHoveredId(row.id); setTooltip({ x: cx, y, row }); }}
                      onMouseLeave={() => { setHoveredId(null); setTooltip(null); }}
                      onClick={() => { setSelectedId(row.id); setDetailTask(row); }}
                    />
                  );
                }

                // Group bar — thin summary band
                if (row.type === 'group') {
                  const bh = 8;
                  const by = y + h / 2 - bh / 2;
                  return (
                    <div
                      key={row.id}
                      className="absolute"
                      style={{ left: bx, top: by, width: Math.max(bw, 2), height: bh, zIndex: 5 }}
                      onMouseEnter={() => { setHoveredId(row.id); setTooltip({ x: bx + bw / 2, y, row }); }}
                      onMouseLeave={() => { setHoveredId(null); setTooltip(null); }}
                    >
                      <div className="absolute inset-0 rounded-full" style={{ backgroundColor: colors.bar, opacity: 0.2 }} />
                      <div className="absolute left-0 top-0 bottom-0 rounded-full" style={{ width: `${pct}%`, backgroundColor: colors.bar, opacity: 0.7 }} />
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-full" style={{ backgroundColor: colors.bar }} />
                      <div className="absolute right-0 top-0 bottom-0 w-1.5 rounded-r-full" style={{ backgroundColor: colors.bar }} />
                    </div>
                  );
                }

                // Regular task — depth 0=group(handled above), 1=task(18px), 2=subtask(14px)
                const bh = row._depth >= 2 ? 14 : row._depth === 1 ? 18 : 24;
                const by = y + h / 2 - bh / 2;
                const radius = row._depth >= 2 ? 4 : row._depth === 1 ? 6 : 8;

                return (
                  <div
                    key={row.id}
                    className="absolute group"
                    style={{
                      left: bx, top: by,
                      width: Math.max(bw, 4), height: bh,
                      zIndex: isDrag ? 30 : isHov ? 20 : 10,
                      cursor: isDrag ? 'grabbing' : 'grab',
                    }}
                    onMouseEnter={() => { setHoveredId(row.id); setTooltip({ x: bx + bw / 2, y, row }); }}
                    onMouseLeave={() => { if (!isDrag) { setHoveredId(null); setTooltip(null); } }}
                    onMouseDown={(e) => onBarMouseDown(e, row, 'move')}
                    onClick={(e) => { e.stopPropagation(); setSelectedId(row.id); setDetailTask(row); }}
                  >
                    {/* Background */}
                    <div
                      className="absolute inset-0 transition-shadow"
                      style={{
                        backgroundColor: colors.bg,
                        borderRadius: radius,
                        border: `1.5px solid ${colors.border}`,
                        boxShadow: isHov || isDrag
                          ? `0 4px 12px ${colors.bar}25`
                          : `0 1px 3px ${colors.bar}15`,
                      }}
                    />

                    {/* Progress fill */}
                    {pct > 0 && (
                      <div
                        className="absolute left-0 top-0 bottom-0"
                        style={{
                          width: `${Math.min(100, pct)}%`,
                          backgroundColor: colors.bar,
                          borderRadius: pct >= 99 ? radius : `${radius}px 0 0 ${radius}px`,
                          opacity: 0.82,
                        }}
                      />
                    )}

                    {/* Label */}
                    {bw > 55 && (
                      <span
                        className="absolute inset-0 flex items-center px-2 text-[10px] font-semibold truncate pointer-events-none"
                        style={{ color: pct > 55 ? 'white' : colors.text }}
                      >
                        {row.name}
                      </span>
                    )}

                    {/* Progress % badge outside bar */}
                    {bw > 40 && pct > 0 && (
                      <span
                        className="absolute text-[9px] font-bold pointer-events-none"
                        style={{ right: -24, top: '50%', transform: 'translateY(-50%)', color: colors.bar }}
                      >
                        {pct}%
                      </span>
                    )}

                    {/* Resize handles */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ borderRadius: `${radius}px 0 0 ${radius}px`, backgroundColor: `${colors.bar}50` }}
                      onMouseDown={(e) => onBarMouseDown(e, row, 'resize-left')}
                    />
                    <div
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ borderRadius: `0 ${radius}px ${radius}px 0`, backgroundColor: `${colors.bar}50` }}
                      onMouseDown={(e) => onBarMouseDown(e, row, 'resize-right')}
                    />
                  </div>
                );
              })}

              {/* ── Tooltip ── */}
              {tooltip && !dragging && (
                <div
                  className="absolute z-50 pointer-events-none"
                  style={{
                    left: Math.min(tooltip.x, totalWidth - 200),
                    top: tooltip.y - 8,
                    transform: 'translateY(-100%)',
                  }}
                >
                  <div className="bg-[#111827] text-white rounded-xl px-3 py-2.5 shadow-2xl text-xs min-w-[170px]">
                    <div className="font-bold text-sm mb-1.5">{tooltip.row.name}</div>
                    <div className="flex items-center gap-1.5 mb-1 text-gray-300">
                      <Calendar size={10} />
                      <span>{fmtShort(tooltip.row.start)} – {fmtShort(tooltip.row.end)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-300">
                      <Clock size={10} />
                      <span>Progress: {tooltip.row.progress}%</span>
                    </div>
                    {tooltip.row.zone && (
                      <div className="flex items-center gap-1.5 mt-1 text-gray-300">
                        <MapPin size={10} />
                        <span>{tooltip.row.zone}</span>
                      </div>
                    )}
                    {tooltip.row.criticalPath && (
                      <div className="mt-1.5 text-red-300 font-semibold text-[10px] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                        Critical Path
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Detail drawer ── */}
        {detailTask && (
          <TaskDetailDrawer
            task={detailTask}
            onClose={() => { setDetailTask(null); setSelectedId(null); }}
          />
        )}
      </div>

      {/* ── Legend ── */}
      <div className="flex items-center justify-center flex-wrap gap-4 px-4 py-2.5 border-t border-gray-100 bg-gray-50/60 flex-shrink-0">
        {Object.entries({
          'In Progress': '#3BB2A5',
          'Completed':   '#059669',
          'Delayed':     '#DC2626',
          'Critical':    '#EF4444',
          'Not Started': '#6B7280',
        }).map(([label, color]) => (
          <span key={label} className="flex items-center gap-1.5 text-[10px] text-[#6B7280]">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}