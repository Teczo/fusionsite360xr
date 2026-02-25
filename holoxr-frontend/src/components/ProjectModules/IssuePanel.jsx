import { useState, useMemo } from 'react';
import { X, Trash2, MapPin, ChevronDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// ─── Constants ────────────────────────────────────────────────────────────────

const SEVERITY_OPTIONS = ['Critical', 'Warning', 'Info'];
const TYPE_OPTIONS     = ['RFI', 'Observation', 'Safety', 'Clash', 'Defect'];
const STATUS_OPTIONS   = ['Not Started', 'In Progress', 'Completed', 'Delayed', 'On Hold'];

const SEVERITY_DOT = {
  Critical: 'bg-red-500',
  Warning:  'bg-amber-500',
  Info:     'bg-blue-500',
};

const SEVERITY_BADGE = {
  Critical: 'bg-red-500/15 text-red-400 border-red-500/30',
  Warning:  'bg-amber-500/15 text-amber-400 border-amber-500/30',
  Info:     'bg-blue-500/15 text-blue-400 border-blue-500/30',
};

const STATUS_BADGE = {
  'Not Started': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'In Progress': 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  'Completed':   'bg-white/10 text-white/40 border-white/20',
  'Delayed':     'bg-red-500/15 text-red-400 border-red-500/30',
  'On Hold':     'bg-violet-500/15 text-violet-400 border-violet-500/30',
};

// Human-readable display labels for status
const STATUS_LABEL = {
  'Not Started': 'Open',
  'In Progress': 'In Progress',
  'Completed':   'Closed',
  'Delayed':     'Delayed',
  'On Hold':     'On Hold',
};

function relTime(dateStr) {
  if (!dateStr) return '—';
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return '—';
  }
}

// ─── IssueCell ────────────────────────────────────────────────────────────────

function IssueCell({
  issue,
  isSelected,
  currentUser,
  onFocus,
  onStatusChange,
  onDelete,
}) {
  const [statusLoading, setStatusLoading] = useState(false);

  const canEdit   = currentUser && (
    currentUser.role === 'admin' ||
    String(issue.createdBy) === String(currentUser._id)
  );
  const canDelete = canEdit;

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    setStatusLoading(true);
    try {
      await onStatusChange(issue._id, newStatus);
    } finally {
      setStatusLoading(false);
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(issue._id);
  };

  return (
    <div
      onClick={() => onFocus(issue)}
      className={[
        'group relative p-3 rounded-xl border cursor-pointer transition-all duration-150',
        isSelected
          ? 'border-white/30 bg-white/10'
          : 'border-white/5 bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.06]',
      ].join(' ')}
    >
      {/* Selected indicator bar */}
      {isSelected && (
        <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-white/60 rounded-full" />
      )}

      {/* Top row: title + delete */}
      <div className="flex items-start gap-2 mb-2">
        <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${SEVERITY_DOT[issue.severity] ?? 'bg-blue-500'}`} />
        <span className="text-sm font-medium text-white leading-tight flex-1 pr-1">
          {issue.title}
        </span>
        {canDelete && (
          <button
            onClick={handleDelete}
            className="shrink-0 text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-0.5 rounded"
            title="Delete issue"
            aria-label="Delete issue"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Badges row */}
      <div className="flex flex-wrap gap-1 mb-2.5 ml-4">
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${SEVERITY_BADGE[issue.severity] ?? ''}`}>
          {issue.severity}
        </span>
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-white/50">
          {issue.type}
        </span>
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${STATUS_BADGE[issue.status] ?? 'bg-white/5 text-white/40 border-white/10'}`}>
          {STATUS_LABEL[issue.status] ?? issue.status}
        </span>
      </div>

      {/* Status dropdown — only if permitted */}
      {canEdit && (
        <div
          className="ml-4 mb-2 relative"
          onClick={(e) => e.stopPropagation()}
        >
          <select
            value={issue.status}
            onChange={handleStatusChange}
            disabled={statusLoading}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white/70 outline-none focus:border-white/25 disabled:opacity-50 transition-colors appearance-none pr-6 cursor-pointer"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s] ?? s}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30 pointer-events-none" />
        </div>
      )}

      {/* Footer: created time */}
      <div className="ml-4 flex items-center gap-1 text-[10px] text-white/30">
        <span>{relTime(issue.createdAt)}</span>
      </div>
    </div>
  );
}

// ─── IssuePanel ───────────────────────────────────────────────────────────────

/**
 * Right-side issue management panel.
 *
 * Props:
 *   isOpen         – boolean: show/hide panel (activeTool === "issue")
 *   issues         – Issue[] full list
 *   selectedIssueId – string | null
 *   currentUser    – { _id, role } | null
 *   onFocusIssue   – (issue) => void
 *   onStatusChange – (issueId, status) => Promise<void>
 *   onDeleteIssue  – (issueId) => void
 *   onClose        – () => void
 */
export default function IssuePanel({
  isOpen,
  issues,
  selectedIssueId,
  currentUser,
  onFocusIssue,
  onStatusChange,
  onDeleteIssue,
  onClose,
}) {
  // ── Filter state (client-side only) ───────────────────────────────────────
  const [filterStatus,   setFilterStatus]   = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterType,     setFilterType]     = useState('');

  const hasFilters = filterStatus || filterSeverity || filterType;

  const clearFilters = () => {
    setFilterStatus('');
    setFilterSeverity('');
    setFilterType('');
  };

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return issues.filter((issue) => {
      if (filterStatus   && issue.status   !== filterStatus)   return false;
      if (filterSeverity && issue.severity !== filterSeverity) return false;
      if (filterType     && issue.type     !== filterType)     return false;
      return true;
    });
  }, [issues, filterStatus, filterSeverity, filterType]);

  return (
    <div
      className={[
        'absolute top-0 right-0 h-full w-80 bg-[#0F172A]/95 backdrop-blur-sm border-l border-white/10 text-white',
        'flex flex-col transition-transform duration-300 z-10',
        isOpen ? 'translate-x-0' : 'translate-x-full',
      ].join(' ')}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-white/50" />
          <span className="text-sm font-semibold">Issues</span>
          <span className="bg-white/10 text-white/60 text-[10px] font-medium px-1.5 py-0.5 rounded-full">
            {filtered.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-[10px] text-white/40 hover:text-white/70 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              Clear filters
            </button>
          )}
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
            aria-label="Close panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="px-3 py-2.5 border-b border-white/5 shrink-0 space-y-2">
        {/* Status filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/70 outline-none focus:border-white/25 transition-colors"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s] ?? s}</option>
          ))}
        </select>

        <div className="flex gap-2">
          {/* Severity filter */}
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/70 outline-none focus:border-white/25 transition-colors"
          >
            <option value="">All severities</option>
            {SEVERITY_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Type filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/70 outline-none focus:border-white/25 transition-colors"
          >
            <option value="">All types</option>
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Issue list ── */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {issues.length === 0 && (
          <div className="py-12 text-center">
            <MapPin className="w-8 h-8 mx-auto mb-3 text-white/15" />
            <p className="text-xs text-white/30">No issues yet.</p>
            <p className="text-[10px] text-white/20 mt-1">Click the model to drop a pin.</p>
          </div>
        )}

        {issues.length > 0 && filtered.length === 0 && (
          <div className="py-10 text-center">
            <p className="text-xs text-white/30">No issues match the current filters.</p>
            <button
              onClick={clearFilters}
              className="mt-2 text-[10px] text-white/40 hover:text-white/60 underline transition-colors"
            >
              Clear filters
            </button>
          </div>
        )}

        {filtered.map((issue) => (
          <IssueCell
            key={issue._id}
            issue={issue}
            isSelected={issue._id === selectedIssueId}
            currentUser={currentUser}
            onFocus={onFocusIssue}
            onStatusChange={onStatusChange}
            onDelete={onDeleteIssue}
          />
        ))}
      </div>

      {/* ── Footer hint ── */}
      <div className="px-4 py-2.5 border-t border-white/5 shrink-0">
        <p className="text-[10px] text-white/25 text-center">
          Click a cell to focus camera · Click model to pin new issue
        </p>
      </div>
    </div>
  );
}
