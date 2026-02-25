import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  X, Trash2, MapPin, ChevronDown, ChevronRight,
  User, Calendar, Clock, AlertTriangle,
  Paperclip, FileText, Upload, Loader2,
} from 'lucide-react';
import { formatDistanceToNow, format, isPast } from 'date-fns';
import { issuesApi } from '../../services/api.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const SEVERITY_OPTIONS = ['Critical', 'Warning', 'Info'];
const TYPE_OPTIONS     = ['RFI', 'Observation', 'Safety', 'Clash', 'Defect'];
const STATUS_OPTIONS   = ['Open', 'In Progress', 'Closed'];

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
  'Open':        'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'In Progress': 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  'Closed':      'bg-white/10 text-white/35 border-white/15',
};

const ACTION_LABEL = {
  created:            'Created issue',
  status_changed:     'Status changed',
  assigned:           'Assigned to',
  unassigned:         'Unassigned',
  due_date_set:       'Due date set',
  attachment_added:   'Attached file',
  attachment_removed: 'Removed attachment',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relTime(dateStr) {
  if (!dateStr) return '—';
  try { return formatDistanceToNow(new Date(dateStr), { addSuffix: true }); }
  catch { return '—'; }
}

function fmtDate(dateStr) {
  if (!dateStr) return null;
  try { return format(new Date(dateStr), 'dd MMM yyyy'); }
  catch { return null; }
}

function isOverdue(issue) {
  if (!issue.dueDate || issue.status === 'Closed') return false;
  return isPast(new Date(issue.dueDate));
}

function userName(userObj) {
  if (!userObj) return 'Unknown';
  if (typeof userObj === 'string') return 'Unknown';
  return userObj.name || userObj.email || 'Unknown';
}

// ─── HistoryTimeline ──────────────────────────────────────────────────────────

function HistoryTimeline({ history }) {
  if (!history || history.length === 0) {
    return <p className="text-[10px] text-white/25 py-1">No activity recorded.</p>;
  }

  const sorted = [...history].reverse(); // most recent first

  return (
    <div className="space-y-2">
      {sorted.map((entry, i) => {
        const label = ACTION_LABEL[entry.action] ?? entry.action;
        let detail = '';
        if (entry.action === 'status_changed' && entry.meta) {
          detail = `${entry.meta.from} → ${entry.meta.to}`;
        } else if (entry.action === 'assigned' && entry.meta) {
          detail = entry.meta.assigneeName || '';
        } else if (entry.action === 'due_date_set' && entry.meta) {
          detail = entry.meta.dueDate ? (fmtDate(entry.meta.dueDate) ?? '') : 'Cleared';
        } else if ((entry.action === 'attachment_added' || entry.action === 'attachment_removed') && entry.meta) {
          detail = entry.meta.fileName || '';
        }

        return (
          <div key={i} className="flex gap-2 items-start">
            <div className="relative mt-1 shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-white/25" />
              {i < sorted.length - 1 && (
                <div className="absolute top-2 left-[2.5px] w-px h-[calc(100%+4px)] bg-white/10" />
              )}
            </div>
            <div className="min-w-0 flex-1 pb-2">
              <div className="text-[10px] text-white/50 leading-relaxed">
                <span className="text-white/70 font-medium">{userName(entry.userId)}</span>
                {' '}<span>{label}</span>
                {detail && <span className="text-white/35"> · {detail}</span>}
              </div>
              <div className="text-[9px] text-white/25 mt-0.5">{relTime(entry.timestamp)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── AttachmentRow ────────────────────────────────────────────────────────────

function fmtBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024)             return `${bytes} B`;
  if (bytes < 1024 * 1024)      return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentRow({ attachment, canDelete, isDeleting, onDelete }) {
  const isImage = attachment.fileType?.startsWith('image/');
  const isPdf   = attachment.fileType === 'application/pdf';

  return (
    <div className="flex items-center gap-2 bg-white/[0.03] border border-white/5 rounded-lg px-2 py-1.5 group/att">
      {/* Thumbnail / icon */}
      {isImage ? (
        <img
          src={attachment.url}
          alt={attachment.fileName}
          className="w-7 h-7 rounded object-cover shrink-0 bg-white/5"
        />
      ) : isPdf ? (
        <div className="w-7 h-7 rounded bg-red-500/15 flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4 text-red-400" />
        </div>
      ) : (
        <div className="w-7 h-7 rounded bg-white/5 flex items-center justify-center shrink-0">
          <Paperclip className="w-4 h-4 text-white/30" />
        </div>
      )}

      {/* File info */}
      <div className="flex-1 min-w-0">
        <a
          href={attachment.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-[10px] text-white/70 hover:text-white truncate block transition-colors"
          title={attachment.fileName}
        >
          {attachment.fileName}
        </a>
        <div className="text-[9px] text-white/25">{fmtBytes(attachment.fileSize)}</div>
      </div>

      {/* Delete */}
      {canDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); if (!isDeleting) onDelete(attachment.url); }}
          disabled={isDeleting}
          className="shrink-0 text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover/att:opacity-100 disabled:opacity-40"
          title="Remove attachment"
        >
          {isDeleting
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <X className="w-3.5 h-3.5" />
          }
        </button>
      )}
    </div>
  );
}

// ─── AttachmentsSection ───────────────────────────────────────────────────────

function AttachmentsSection({ issue, currentUser }) {
  const [isOpen,      setIsOpen]      = useState(true);
  const [uploading,   setUploading]   = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [deletingUrl, setDeletingUrl] = useState(null);
  const fileInputRef = useRef(null);

  const isAdmin = currentUser?.role === 'admin';
  const attachments = issue.attachments || [];

  const canDeleteAttachment = (att) => {
    if (isAdmin) return true;
    return currentUser && String(att.uploadedBy?._id ?? att.uploadedBy) === String(currentUser._id);
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    setUploadError(null);
    try {
      for (const file of files) {
        await issuesApi.uploadAttachment(issue._id, file);
        // Updated issue arrives via WebSocket → TwinPage state → props
      }
    } catch (err) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (url) => {
    setDeletingUrl(url);
    try {
      await issuesApi.deleteAttachment(issue._id, url);
    } catch (err) {
      console.error('Failed to remove attachment:', err.message);
    } finally {
      setDeletingUrl(null);
    }
  };

  return (
    <div>
      <button
        onClick={() => setIsOpen((p) => !p)}
        className="flex items-center gap-1.5 w-full text-left"
      >
        <span className="text-[9px] text-white/30 uppercase tracking-wider">Attachments</span>
        {attachments.length > 0 && (
          <span className="bg-white/10 text-white/50 text-[9px] px-1.5 py-px rounded-full leading-none">
            {attachments.length}
          </span>
        )}
        <ChevronRight className={`w-2.5 h-2.5 text-white/25 ml-auto transition-transform duration-150 ${isOpen ? 'rotate-90' : ''}`} />
      </button>

      {isOpen && (
        <div className="mt-1.5 space-y-1.5">
          {/* Upload trigger */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full border border-dashed border-white/10 rounded-lg py-1.5 text-[10px] text-white/30 hover:text-white/50 hover:border-white/20 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
          >
            {uploading
              ? <><Loader2 className="w-3 h-3 animate-spin" />Uploading…</>
              : <><Upload className="w-3 h-3" />Attach file</>
            }
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx"
            onChange={handleFileChange}
            className="hidden"
          />

          {uploadError && (
            <p className="text-[10px] text-red-400">{uploadError}</p>
          )}

          {attachments.length === 0 && !uploading && (
            <p className="text-[10px] text-white/20 text-center py-1">No attachments yet.</p>
          )}

          {attachments.map((att) => (
            <AttachmentRow
              key={att._id || att.url}
              attachment={att}
              canDelete={canDeleteAttachment(att)}
              isDeleting={deletingUrl === att.url}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── IssueDetail ─────────────────────────────────────────────────────────────

function IssueDetail({ issue, members, currentUser, onUpdate }) {
  const [saving, setSaving] = useState(null);

  const isAdmin    = currentUser?.role === 'admin';
  const isCreator  = currentUser && String(issue.createdBy?._id ?? issue.createdBy) === String(currentUser._id);
  const isAssigned = currentUser && String(issue.assignedTo?._id ?? issue.assignedTo) === String(currentUser._id);

  const canEditMeta   = isAdmin || isCreator;
  const canTransition = isAdmin || isAssigned;

  const save = useCallback(async (field, value) => {
    setSaving(field);
    try { await onUpdate(issue._id, { [field]: value }); }
    finally { setSaving(null); }
  }, [issue._id, onUpdate]);

  const handleStatus = (e) => save('status', e.target.value);
  const handleAssign = (e) => save('assignedTo', e.target.value || null);
  const handleDue    = (e) => save('dueDate', e.target.value || null);

  const assignedId = String(issue.assignedTo?._id ?? issue.assignedTo ?? '');
  const overdue    = isOverdue(issue);

  // Allowed status transitions for this user
  const statusOpts = STATUS_OPTIONS.filter((s) => {
    if (s === issue.status) return true;
    if (s === 'Open') return canEditMeta;
    return canTransition;
  });

  return (
    <div className="mt-2.5 pt-2.5 border-t border-white/5 space-y-3" onClick={(e) => e.stopPropagation()}>

      {/* Description */}
      {issue.description && (
        <p className="text-[11px] text-white/50 leading-relaxed">{issue.description}</p>
      )}

      {/* Status */}
      <div>
        <label className="block text-[9px] text-white/30 mb-1 uppercase tracking-wider">Status</label>
        {canEditMeta || canTransition ? (
          <div className="relative">
            <select
              value={issue.status}
              onChange={handleStatus}
              disabled={saving === 'status'}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/80 outline-none focus:border-white/25 disabled:opacity-40 appearance-none pr-6 cursor-pointer"
            >
              {statusOpts.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30 pointer-events-none" />
          </div>
        ) : (
          <span className={`inline-flex text-[10px] font-medium px-2 py-1 rounded border ${STATUS_BADGE[issue.status] ?? ''}`}>
            {issue.status}
          </span>
        )}
        {!canEditMeta && !canTransition && (
          <p className="text-[9px] text-white/25 mt-1">Assign yourself to change status.</p>
        )}
      </div>

      {/* Assignment */}
      <div>
        <label className="block text-[9px] text-white/30 mb-1 uppercase tracking-wider">Assigned to</label>
        {canEditMeta ? (
          <div className="relative">
            <select
              value={assignedId}
              onChange={handleAssign}
              disabled={saving === 'assignedTo'}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/80 outline-none focus:border-white/25 disabled:opacity-40 appearance-none pr-6 cursor-pointer"
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m._id} value={m._id}>{m.name} ({m.role})</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30 pointer-events-none" />
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-white/60">
            <User className="w-3 h-3 text-white/30" />
            {issue.assignedTo ? userName(issue.assignedTo) : <span className="text-white/30">Unassigned</span>}
          </div>
        )}
      </div>

      {/* Due date */}
      <div>
        <label className="block text-[9px] text-white/30 mb-1 uppercase tracking-wider">Due date</label>
        {canEditMeta ? (
          <>
            <input
              type="date"
              value={issue.dueDate ? format(new Date(issue.dueDate), 'yyyy-MM-dd') : ''}
              onChange={handleDue}
              disabled={saving === 'dueDate'}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/80 outline-none focus:border-white/25 disabled:opacity-40 [color-scheme:dark]"
            />
            {overdue && (
              <div className="flex items-center gap-1 mt-1 text-[10px] text-red-400">
                <AlertTriangle className="w-3 h-3" />Overdue
              </div>
            )}
          </>
        ) : (
          <div className={`flex items-center gap-1.5 text-xs ${overdue ? 'text-red-400' : 'text-white/60'}`}>
            <Calendar className="w-3 h-3 text-white/30" />
            {issue.dueDate ? fmtDate(issue.dueDate) : <span className="text-white/30">No due date</span>}
            {overdue && <span className="text-red-400 text-[10px] ml-1">Overdue</span>}
          </div>
        )}
      </div>

      {/* Attachments */}
      <AttachmentsSection issue={issue} currentUser={currentUser} />

      {/* Activity timeline */}
      <div>
        <label className="block text-[9px] text-white/30 mb-1.5 uppercase tracking-wider">Activity</label>
        <HistoryTimeline history={issue.history} />
      </div>
    </div>
  );
}

// ─── IssueCell ────────────────────────────────────────────────────────────────

function IssueCell({
  issue,
  isSelected,
  isExpanded,
  members,
  currentUser,
  onFocus,
  onToggleExpand,
  onUpdate,
  onDelete,
}) {
  const isAdmin   = currentUser?.role === 'admin';
  const isCreator = currentUser && String(issue.createdBy?._id ?? issue.createdBy) === String(currentUser._id);
  const canDelete = isAdmin || isCreator;

  const overdue  = isOverdue(issue);
  const isClosed = issue.status === 'Closed';

  return (
    <div
      onClick={() => onFocus(issue)}
      className={[
        'group relative rounded-xl border cursor-pointer transition-all duration-150',
        isClosed ? 'opacity-50' : '',
        isSelected
          ? 'border-white/30 bg-white/10'
          : 'border-white/5 bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.06]',
      ].join(' ')}
    >
      {isSelected && (
        <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-white/60 rounded-full" />
      )}

      <div className="p-3">
        {/* Title row */}
        <div className="flex items-start gap-1.5 mb-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleExpand(issue._id); }}
            className="shrink-0 mt-[3px] text-white/25 hover:text-white/60 transition-colors"
          >
            <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
          </button>

          <div className={`mt-[5px] w-1.5 h-1.5 rounded-full shrink-0 ${SEVERITY_DOT[issue.severity] ?? 'bg-blue-500'}`} />

          <span className="text-sm font-medium text-white leading-tight flex-1">
            {issue.title}
          </span>

          {canDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(issue._id); }}
              className="shrink-0 text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-0.5 rounded"
              title="Delete issue"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1 ml-[22px] mb-2">
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${SEVERITY_BADGE[issue.severity] ?? ''}`}>
            {issue.severity}
          </span>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-white/50">
            {issue.type}
          </span>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${STATUS_BADGE[issue.status] ?? ''}`}>
            {issue.status}
          </span>
          {overdue && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border bg-red-500/15 text-red-400 border-red-500/30 flex items-center gap-0.5">
              <AlertTriangle className="w-2.5 h-2.5" />Overdue
            </span>
          )}
        </div>

        {/* Footer meta */}
        <div className="ml-[22px] flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-white/30">
          <div className="flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />{relTime(issue.createdAt)}
          </div>
          {issue.assignedTo && (
            <div className="flex items-center gap-1">
              <User className="w-2.5 h-2.5" />{userName(issue.assignedTo)}
            </div>
          )}
          {issue.dueDate && (
            <div className={`flex items-center gap-1 ${overdue ? 'text-red-400/70' : ''}`}>
              <Calendar className="w-2.5 h-2.5" />{fmtDate(issue.dueDate)}
            </div>
          )}
        </div>

        {/* Expanded detail */}
        {isExpanded && (
          <IssueDetail
            issue={issue}
            members={members}
            currentUser={currentUser}
            onUpdate={onUpdate}
          />
        )}
      </div>
    </div>
  );
}

// ─── IssuePanel (root) ────────────────────────────────────────────────────────

/**
 * Props:
 *   isOpen          – boolean
 *   projectId       – string
 *   issues          – Issue[]
 *   selectedIssueId – string | null
 *   currentUser     – { _id, role } | null
 *   onFocusIssue    – (issue) => void
 *   onUpdateIssue   – (issueId, patch) => Promise<void>
 *   onDeleteIssue   – (issueId) => void
 *   onClose         – () => void
 */
export default function IssuePanel({
  isOpen,
  projectId,
  issues,
  selectedIssueId,
  currentUser,
  onFocusIssue,
  onUpdateIssue,
  onDeleteIssue,
  onClose,
}) {
  // ── Members (for assignment dropdown) ─────────────────────────────────────
  const [members, setMembers] = useState([]);

  useEffect(() => {
    if (!isOpen || !projectId) return;
    issuesApi.members(projectId).then(setMembers).catch(() => {});
  }, [isOpen, projectId]);

  // ── Expand state ───────────────────────────────────────────────────────────
  const [expandedId, setExpandedId] = useState(null);

  const toggleExpand = useCallback((id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  // Auto-expand when a pin is selected from the scene
  useEffect(() => {
    if (selectedIssueId) setExpandedId(selectedIssueId);
  }, [selectedIssueId]);

  // ── Filters ────────────────────────────────────────────────────────────────
  const [filterStatus,   setFilterStatus]   = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterType,     setFilterType]     = useState('');

  const hasFilters = filterStatus || filterSeverity || filterType;
  const clearFilters = () => { setFilterStatus(''); setFilterSeverity(''); setFilterType(''); };

  const filtered = useMemo(() => issues.filter((issue) => {
    if (filterStatus   && issue.status   !== filterStatus)   return false;
    if (filterSeverity && issue.severity !== filterSeverity) return false;
    if (filterType     && issue.type     !== filterType)     return false;
    return true;
  }), [issues, filterStatus, filterSeverity, filterType]);

  return (
    <div className={[
      'absolute top-0 right-0 h-full w-80 bg-[#0F172A]/95 backdrop-blur-sm border-l border-white/10 text-white',
      'flex flex-col transition-transform duration-300 z-10',
      isOpen ? 'translate-x-0' : 'translate-x-full',
    ].join(' ')}>

      {/* Header */}
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
            <button onClick={clearFilters} className="text-[10px] text-white/40 hover:text-white/70 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors">
              Clear filters
            </button>
          )}
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10" aria-label="Close panel">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-3 py-2.5 border-b border-white/5 shrink-0 space-y-2">
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/70 outline-none focus:border-white/25 transition-colors">
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="flex gap-2">
          <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/70 outline-none focus:border-white/25 transition-colors">
            <option value="">All severities</option>
            {SEVERITY_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/70 outline-none focus:border-white/25 transition-colors">
            <option value="">All types</option>
            {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Issue list */}
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
            <button onClick={clearFilters} className="mt-2 text-[10px] text-white/40 hover:text-white/60 underline transition-colors">
              Clear filters
            </button>
          </div>
        )}
        {filtered.map((issue) => (
          <IssueCell
            key={issue._id}
            issue={issue}
            isSelected={issue._id === selectedIssueId}
            isExpanded={issue._id === expandedId}
            members={members}
            currentUser={currentUser}
            onFocus={onFocusIssue}
            onToggleExpand={toggleExpand}
            onUpdate={onUpdateIssue}
            onDelete={onDeleteIssue}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-white/5 shrink-0">
        <p className="text-[10px] text-white/25 text-center">
          Click a cell to focus camera · Click model to pin new issue
        </p>
      </div>
    </div>
  );
}
