import { useEffect, useRef, useState } from 'react';
import {
  LayoutGrid, List, Calendar, GanttChartSquare,
  Upload, Trash2, Plus,
  TrendingUp, Package, Users, DollarSign,
} from 'lucide-react';
import { timelineApi, scheduleApi, assignmentApi, materialApi, costApi } from '../../../services/api';
import { useRole } from '../../hooks/useRole';
import EmptyState from '../../ui/EmptyState';
import LoadingSpinner from '../../ui/LoadingSpinner';
import GanttChart from './GanttChart';
import TimelineKanban from './TimelineKanban';
import TimelineCalendar from './TimelineCalendar';
import TimelineTaskModal from './TimelineTaskModal';

// ─── Health helpers ───────────────────────────────────────────────────────────

function getHealth(task) {
  const now = Date.now();
  const end = new Date(task.plannedFinish).getTime();
  const pct = Number(task.percentComplete ?? task.progress ?? 0);
  if (pct >= 100) return 'completed';
  if (isNaN(end)) return 'not_started';
  if (now > end && pct < 100) return 'delayed';
  if (pct > 0) return 'in_progress';
  return 'not_started';
}

const HEALTH_BADGE = {
  completed:   'bg-emerald-50 text-emerald-700 border border-emerald-200',
  in_progress: 'bg-[#F0FDFB] text-[#134E4A] border border-[#99F6E4]',
  delayed:     'bg-red-50 text-red-700 border border-red-200',
  not_started: 'bg-gray-100 text-gray-500 border border-gray-200',
};

const HEALTH_LABEL = {
  completed:   'Completed',
  in_progress: 'In Progress',
  delayed:     'Delayed',
  not_started: 'Not Started',
};

function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Schedule List sub-view ───────────────────────────────────────────────────

function ScheduleListView({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-2">
        <p className="text-sm font-medium text-[#9CA3AF]">No schedule data</p>
        <p className="text-xs text-[#D1D5DB]">Upload a schedule CSV to see the task list</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            {['Task', 'Start', 'Finish', 'Progress', 'Health', 'Critical'].map((h) => (
              <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {data.map((task, i) => {
            const health = getHealth(task);
            const pct = Number(task.percentComplete ?? task.progress ?? 0);
            return (
              <tr key={task._id || task.activityId || i} className="hover:bg-gray-50/60 transition-colors">
                <td className="px-5 py-3 font-medium text-[#111827]">{task.name || task.activityId || 'Unnamed'}</td>
                <td className="px-5 py-3 text-xs text-[#6B7280]">{fmt(task.plannedStart)}</td>
                <td className="px-5 py-3 text-xs text-[#6B7280]">{fmt(task.plannedFinish)}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden min-w-[60px]">
                      <div className="h-full rounded-full bg-[#3BB2A5]" style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <span className="text-xs text-[#9CA3AF] w-8 text-right">{pct}%</span>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${HEALTH_BADGE[health]}`}>{HEALTH_LABEL[health]}</span>
                </td>
                <td className="px-5 py-3">
                  {task.criticalPath
                    ? <span className="text-[10px] font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">Critical</span>
                    : <span className="text-[10px] text-[#9CA3AF]">—</span>
                  }
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Cost / Resources / Materials views ──────────────────────────────────────

function CostView({ data }) {
  if (!data.length) return <EmptyState title="No cost data" description="Upload a cost CSV to see cost intelligence." />;
  const total    = data.reduce((s, c) => s + Number(c.amount || c.actualCost || c.total || 0), 0);
  const budgeted = data.reduce((s, c) => s + Number(c.budgetedCost || c.budget || 0), 0);
  const variance = budgeted > 0 ? ((total - budgeted) / budgeted) * 100 : null;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Actual Cost', value: `$${total.toLocaleString()}`, icon: DollarSign, color: '#3BB2A5' },
          { label: 'Budgeted', value: budgeted > 0 ? `$${budgeted.toLocaleString()}` : '—', icon: TrendingUp, color: '#2563EB' },
          { label: 'Variance', value: variance !== null ? `${variance > 0 ? '+' : ''}${variance.toFixed(1)}%` : '—', icon: TrendingUp, color: variance > 5 ? '#DC2626' : '#059669' },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: card.color + '15' }}>
              <card.icon size={18} style={{ color: card.color }} />
            </div>
            <div>
              <p className="text-xs text-[#6B7280]">{card.label}</p>
              <p className="text-lg font-bold text-[#111827]">{card.value}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50"><h4 className="text-sm font-semibold text-[#111827]">Cost Breakdown</h4></div>
        <div className="overflow-auto max-h-[380px]">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Category</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Amount</th>
                {data[0]?.budgetedCost !== undefined && <th className="text-right px-5 py-3 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Budget</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((c, i) => (
                <tr key={i} className="hover:bg-gray-50/60">
                  <td className="px-5 py-3 font-medium text-[#111827]">{c.category || c.code || 'N/A'}</td>
                  <td className="px-5 py-3 text-right text-[#374151]">${Number(c.amount || c.actualCost || c.total || 0).toLocaleString()}</td>
                  {c.budgetedCost !== undefined && <td className="px-5 py-3 text-right text-[#6B7280]">${Number(c.budgetedCost || 0).toLocaleString()}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ResourcesView({ data }) {
  if (!data.length) return <EmptyState title="No assignment data" description="Upload a CSV to see discipline responsibilities and contractors." />;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Disciplines', value: [...new Set(data.map((a) => a.discipline).filter(Boolean))].length, icon: Users, color: '#3BB2A5' },
          { label: 'Contractors', value: [...new Set(data.map((a) => a.contractor).filter(Boolean))].length, icon: Package, color: '#2563EB' },
          { label: 'Active Assignments', value: data.filter((a) => a.status?.toLowerCase() === 'active').length, icon: TrendingUp, color: '#059669' },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: card.color + '15' }}>
              <card.icon size={18} style={{ color: card.color }} />
            </div>
            <div>
              <p className="text-xs text-[#6B7280]">{card.label}</p>
              <p className="text-2xl font-bold text-[#111827]">{card.value}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50"><h4 className="text-sm font-semibold text-[#111827]">Resource Assignments</h4></div>
        <div className="overflow-auto max-h-[380px]">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                {['Discipline', 'Contractor', 'Responsible', 'Zone', 'Status'].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((a, i) => (
                <tr key={i} className="hover:bg-gray-50/60">
                  <td className="px-5 py-3 font-medium text-[#111827]">{a.discipline || '—'}</td>
                  <td className="px-5 py-3 text-[#374151]">{a.contractor || '—'}</td>
                  <td className="px-5 py-3 text-[#374151]">{a.responsiblePerson || '—'}</td>
                  <td className="px-5 py-3 text-[#6B7280]">{a.zone || '—'}</td>
                  <td className="px-5 py-3">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${a.status?.toLowerCase() === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                      {a.status || 'N/A'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MaterialsView({ data }) {
  if (!data.length) return <EmptyState title="No material data" description="Upload a CSV to see material quantities by level." />;
  const totalQty = data.reduce((s, m) => s + Number(m.quantity || 0), 0);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {[
          { label: 'Levels', value: [...new Set(data.map((m) => m.level).filter(Boolean))].length, color: '#3BB2A5' },
          { label: 'Material Types', value: [...new Set(data.map((m) => m.materialType).filter(Boolean))].length, color: '#2563EB' },
          { label: 'Total Quantity', value: totalQty.toLocaleString(), color: '#7C3AED' },
        ].map((chip) => (
          <div key={chip.label} className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.05)] px-4 py-3 flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: chip.color }} />
            <span className="text-xs text-[#6B7280]">{chip.label}</span>
            <span className="text-sm font-bold text-[#111827]">{chip.value}</span>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50"><h4 className="text-sm font-semibold text-[#111827]">Material Inventory</h4></div>
        <div className="overflow-auto max-h-[380px]">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                {['Level', 'Material', 'Quantity', 'Unit'].map((h, i) => (
                  <th key={h} className={`${i === 2 ? 'text-right' : 'text-left'} px-5 py-3 text-xs font-semibold text-[#6B7280] uppercase tracking-wider`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((m, i) => (
                <tr key={i} className="hover:bg-gray-50/60">
                  <td className="px-5 py-3 font-medium text-[#111827]">{m.level || '—'}</td>
                  <td className="px-5 py-3 text-[#374151]">{m.materialType || '—'}</td>
                  <td className="px-5 py-3 text-right font-semibold text-[#111827]">{Number(m.quantity ?? 0).toLocaleString()}</td>
                  <td className="px-5 py-3 text-[#9CA3AF]">{m.unit || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Reusable button components ───────────────────────────────────────────────

function UploadBtn({ label, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 rounded-lg border border-[#3BB2A5] bg-[#3BB2A5] px-3 py-2 text-sm font-semibold text-white hover:bg-[#2d9a8e] transition disabled:opacity-50"
    >
      <Upload size={14} />
      {disabled ? 'Uploading…' : label}
    </button>
  );
}

function ClearBtn({ onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 text-sm font-medium text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg border border-red-200 transition"
    >
      <Trash2 size={14} />
      Clear Data
    </button>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAIN_TABS = [
  { key: 'gantt',     label: 'Timeline',          icon: GanttChartSquare },
  { key: 'cost',      label: 'Cost Intelligence',  icon: DollarSign },
  { key: 'resources', label: 'Resources',          icon: Users },
  { key: 'materials', label: 'Materials',          icon: Package },
];

const VIEW_TABS = [
  { key: 'gantt',    label: 'Gantt',    icon: GanttChartSquare },
  { key: 'kanban',   label: 'Kanban',   icon: LayoutGrid },
  { key: 'list',     label: 'List',     icon: List },
  { key: 'calendar', label: 'Calendar', icon: Calendar },
];

// ─── Health card icons ────────────────────────────────────────────────────────

const AheadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M3 13l4-4 3 3 5-6" stroke="#059669" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const OnTrackIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <circle cx="9" cy="9" r="6.5" stroke="#3BB2A5" strokeWidth="1.75"/>
    <path d="M9 5v4l2.5 1.5" stroke="#3BB2A5" strokeWidth="1.75" strokeLinecap="round"/>
  </svg>
);

const DelayedIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <circle cx="9" cy="9" r="6.5" stroke="#DC2626" strokeWidth="1.75"/>
    <path d="M9 5.5v4" stroke="#DC2626" strokeWidth="1.75" strokeLinecap="round"/>
    <circle cx="9" cy="12" r="0.75" fill="#DC2626"/>
  </svg>
);

// ─── Main component ───────────────────────────────────────────────────────────

export default function TimelineList({ projectId }) {
  const [items, setItems]               = useState([]);
  const [scheduleData, setScheduleData] = useState([]);
  const [costData, setCostData]         = useState([]);
  const [assignmentData, setAssignmentData] = useState([]);
  const [materialData, setMaterialData] = useState([]);

  const [loading, setLoading]         = useState(true);
  const [uploading, setUploading]     = useState(false);
  const [uploadError, setUploadError] = useState('');

  const [activeTab, setActiveTab]       = useState('gantt');
  const [timelineView, setTimelineView] = useState('gantt');
  const [showModal, setShowModal]       = useState(false);
  const [editing, setEditing]           = useState(null);

  const fileInputRef       = useRef(null);
  const costInputRef       = useRef(null);
  const assignmentInputRef = useRef(null);
  const materialInputRef   = useRef(null);
  const { canEdit }        = useRole();

  // ── Data loaders ─────────────────────────────────────────────────────────

  const loadTimeline    = () => timelineApi.list(projectId).then(setItems).catch(() => setItems([]));
  const loadSchedule    = () => scheduleApi.list(projectId).then(setScheduleData).catch(() => setScheduleData([]));
  const loadCosts       = () => costApi.list(projectId).then(setCostData).catch(() => setCostData([]));
  const loadAssignments = () => assignmentApi.list(projectId).then(setAssignmentData).catch(() => setAssignmentData([]));
  const loadMaterials   = () => materialApi.list(projectId).then(setMaterialData).catch(() => setMaterialData([]));

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    Promise.all([loadTimeline(), loadSchedule(), loadCosts(), loadAssignments(), loadMaterials()])
      .finally(() => setLoading(false));
  }, [projectId]);

  // ── CRUD ─────────────────────────────────────────────────────────────────

  const handleSave = async (data) => {
    if (editing) await timelineApi.update(projectId, editing._id, data);
    else         await timelineApi.create(projectId, data);
    setShowModal(false);
    setEditing(null);
    loadTimeline();
  };

  const openAdd = () => { setEditing(null); setShowModal(true); };

  // ── Uploaders ────────────────────────────────────────────────────────────

  const makeUploader = (apiCall, reload) => async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    setUploadError('');
    try { await apiCall(projectId, file); await reload(); }
    catch (err) { setUploadError(err.message || 'Upload failed'); }
    finally { setUploading(false); }
  };

  const handleUpload           = makeUploader(scheduleApi.upload,   loadSchedule);
  const handleUploadCost       = makeUploader(costApi.upload,       loadCosts);
  const handleUploadAssignment = makeUploader(assignmentApi.upload, loadAssignments);
  const handleUploadMaterial   = makeUploader(materialApi.upload,   loadMaterials);

  // ── Clearers ─────────────────────────────────────────────────────────────

  const makeClearer = (apiCall, reset, msg) => async () => {
    if (!window.confirm(msg)) return;
    try { await apiCall(projectId); reset([]); }
    catch (err) { setUploadError(err.message || 'Failed to clear data'); }
  };

  const handleClearSchedule   = makeClearer(scheduleApi.clear,   setScheduleData,   'Clear all schedule data? This cannot be undone.');
  const handleClearCost       = makeClearer(costApi.clear,       setCostData,       'Clear all cost data? This cannot be undone.');
  const handleClearAssignment = makeClearer(assignmentApi.clear, setAssignmentData, 'Clear all assignment data? This cannot be undone.');
  const handleClearMaterial   = makeClearer(materialApi.clear,   setMaterialData,   'Clear all material data? This cannot be undone.');

  if (loading) return <LoadingSpinner />;

  // ── Computed stats ────────────────────────────────────────────────────────
  const total      = scheduleData.length;
  const completed  = scheduleData.filter(t => Number(t.percentComplete ?? t.progress ?? 0) >= 100).length;
  const delayed    = scheduleData.filter(t => {
    const now = Date.now(), end = new Date(t.plannedFinish).getTime(), p = Number(t.percentComplete ?? t.progress ?? 0);
    return !isNaN(end) && now > end && p < 100;
  }).length;
  const inProgress = scheduleData.filter(t => { const p = Number(t.percentComplete ?? t.progress ?? 0); return p > 0 && p < 100; }).length;
  const notStarted = Math.max(0, total - completed - delayed - inProgress);
  const milestones = items.length;
  const avgPct     = total > 0
    ? Math.round(scheduleData.reduce((s, t) => s + Number(t.percentComplete ?? t.progress ?? 0), 0) / total)
    : 0;
  const ahead   = scheduleData.filter(t => {
    const now = Date.now(), end = new Date(t.plannedFinish).getTime(), p = Number(t.percentComplete ?? t.progress ?? 0);
    return p > 0 && p < 100 && !isNaN(end) && now < end;
  }).length;
  const onTrack = Math.max(0, inProgress - ahead);

  const healthCards = [
    {
      key: 'ahead', label: 'AHEAD OF SCHEDULE', count: ahead,
      pct: total > 0 ? Math.round((ahead / total) * 100) : 0,
      desc: 'Progress exceeds expected timeline',
      color: '#059669', barBg: '#D1FAE5',
      Icon: AheadIcon,
    },
    {
      key: 'ontrack', label: 'ON TRACK', count: onTrack,
      pct: total > 0 ? Math.round((onTrack / total) * 100) : 0,
      desc: 'Progressing as planned',
      color: '#3BB2A5', barBg: '#CCFBF1',
      Icon: OnTrackIcon,
    },
    {
      key: 'delayed', label: 'DELAYED', count: delayed,
      pct: total > 0 ? Math.round((delayed / total) * 100) : 0,
      desc: 'Behind schedule or overdue',
      color: '#DC2626', barBg: '#FEE2E2',
      Icon: DelayedIcon,
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>

      {/* ══ ROW 1: Page title (left) + View toggle + Actions (right) ══ */}
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">

        {/* Left: title + subtitle */}
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Project Timeline</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            {total > 0
              ? <>{total} task{total !== 1 ? 's' : ''} · {completed} completed · {milestones} milestone{milestones !== 1 ? 's' : ''}</>
              : 'Track schedules, costs, resources and materials'
            }
          </p>
        </div>

        {/* Right: upload/clear + add task */}
        <div className="flex items-center gap-2 flex-wrap">

          {/* Upload + Clear per tab */}
          {activeTab === 'gantt' && canEdit && (
            <>
              {scheduleData.length > 0 && <ClearBtn onClick={handleClearSchedule} disabled={uploading} />}
              <UploadBtn label="Upload Schedule" onClick={() => fileInputRef.current?.click()} disabled={uploading} />
              <input ref={fileInputRef} type="file" accept=".csv" onChange={handleUpload} className="hidden" />
            </>
          )}
          {activeTab === 'cost' && canEdit && (
            <>
              {costData.length > 0 && <ClearBtn onClick={handleClearCost} disabled={uploading} />}
              <UploadBtn label="Upload Cost" onClick={() => costInputRef.current?.click()} disabled={uploading} />
              <input ref={costInputRef} type="file" accept=".csv" onChange={handleUploadCost} className="hidden" />
            </>
          )}
          {activeTab === 'resources' && canEdit && (
            <>
              {assignmentData.length > 0 && <ClearBtn onClick={handleClearAssignment} disabled={uploading} />}
              <UploadBtn label="Upload Assignments" onClick={() => assignmentInputRef.current?.click()} disabled={uploading} />
              <input ref={assignmentInputRef} type="file" accept=".csv" onChange={handleUploadAssignment} className="hidden" />
            </>
          )}
          {activeTab === 'materials' && canEdit && (
            <>
              {materialData.length > 0 && <ClearBtn onClick={handleClearMaterial} disabled={uploading} />}
              <UploadBtn label="Upload Materials" onClick={() => materialInputRef.current?.click()} disabled={uploading} />
              <input ref={materialInputRef} type="file" accept=".csv" onChange={handleUploadMaterial} className="hidden" />
            </>
          )}

          {/* Add Task */}
          {activeTab === 'gantt' && canEdit && (
            <button
              onClick={openAdd}
              className="flex items-center gap-1.5 rounded-lg bg-[#3BB2A5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2d9a8e] transition"
            >
              <Plus size={14} />+ Add Task
            </button>
          )}
        </div>
      </div>

      {uploadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">{uploadError}</div>
      )}

      {/* ══ ROW 2: Main tab bar — no background, sits on page gray ══ */}
      <div className="border-b border-gray-200 flex overflow-x-auto -mx-6 px-6">
        {MAIN_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'border-[#3BB2A5] text-[#3BB2A5] font-semibold'
                : 'border-transparent text-[#6B7280] hover:text-[#374151]'
            }`}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══ ROW 3: Tab content ══ */}

      {/* ── TIMELINE TAB ── */}
      {activeTab === 'gantt' && (
        <div className="mt-4 space-y-4">

          {/* Stats row — view toggle on the right */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-6 flex-wrap">
              {[
                { dot: '#059669', label: 'Completed',   count: completed },
                { dot: '#3BB2A5', label: 'In Progress', count: inProgress },
                { dot: '#D1D5DB', label: 'Pending',     count: notStarted },
              ].map(({ dot, label, count }) => (
                <span key={label} className="flex items-center gap-2 text-sm text-[#374151]">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: dot }} />
                  <span className="font-medium">{label}</span>
                  <span className="font-bold">{count}</span>
                </span>
              ))}
              <span className="flex items-center gap-1.5 text-sm text-[#374151]">
                <span className="text-amber-400">◆</span>
                <span className="font-medium">Milestones</span>
                <span className="font-bold">{milestones}</span>
              </span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-[#059669]" style={{ width: `${avgPct}%` }} />
                </div>
                <span className="text-sm font-bold text-[#111827] w-9 text-right">{avgPct}%</span>
              </div>
            </div>

            {/* View toggle — right side */}
            <div className="flex items-center rounded-lg border border-gray-200 bg-white overflow-hidden">
              {VIEW_TABS.map((v) => (
                <button
                  key={v.key}
                  onClick={() => setTimelineView(v.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-r border-gray-200 last:border-r-0 ${
                    timelineView === v.key
                      ? 'bg-[#F0FDFB] text-[#3BB2A5] font-semibold'
                      : 'text-[#6B7280] hover:text-[#374151] hover:bg-gray-50'
                  }`}
                >
                  <v.icon size={14} />
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Health cards — 3 separate bordered cards matching Energy Studio */}
          <div className="grid grid-cols-3 gap-4">
            {healthCards.map((card) => (
              <div
                key={card.key}
                className="bg-white rounded-xl border border-gray-200 px-5 py-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <card.Icon />
                    <span className="text-xs font-bold tracking-wide uppercase" style={{ color: card.color }}>
                      {card.label}
                    </span>
                  </div>
                  <span className="text-3xl font-black leading-none" style={{ color: card.color }}>
                    {card.count}
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ backgroundColor: card.barBg }}>
                  <div className="h-full rounded-full" style={{ width: `${card.pct}%`, backgroundColor: card.color }} />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[#6B7280]">{card.desc}</p>
                  <span className="text-xs font-bold" style={{ color: card.color }}>{card.pct}%</span>
                </div>
              </div>
            ))}
          </div>

          {/* View content */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {timelineView === 'gantt'    && <GanttChart data={scheduleData} />}
            {timelineView === 'kanban'   && <TimelineKanban data={scheduleData} />}
            {timelineView === 'list'     && <ScheduleListView data={scheduleData} />}
            {timelineView === 'calendar' && <TimelineCalendar items={items} scheduleData={scheduleData} />}
          </div>
        </div>
      )}

      {/* ── COST / RESOURCES / MATERIALS TABS ── */}
      {activeTab === 'cost'      && <div className="mt-4"><CostView      data={costData}       /></div>}
      {activeTab === 'resources' && <div className="mt-4"><ResourcesView data={assignmentData}  /></div>}
      {activeTab === 'materials' && <div className="mt-4"><MaterialsView data={materialData}    /></div>}

      {/* Task modal */}
      {showModal && (
        <TimelineTaskModal
          initial={editing}
          onSave={handleSave}
          onCancel={() => { setShowModal(false); setEditing(null); }}
        />
      )}
    </div>
  );
}