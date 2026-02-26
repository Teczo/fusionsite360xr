import { useEffect, useRef, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { timelineApi, scheduleApi } from '../../../services/api';
import { useRole } from '../../hooks/useRole';
import Badge from '../../ui/Badge';
import EmptyState from '../../ui/EmptyState';
import LoadingSpinner from '../../ui/LoadingSpinner';
import TimelineForm from './TimelineForm';
import GanttChart from './GanttChart';

export default function TimelineList({ projectId }) {
  const [items, setItems] = useState([]);
  const [scheduleData, setScheduleData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState(null); // id of item being edited inline
  const [mode, setMode] = useState('manual'); // 'manual' | 'gantt'
  const fileInputRef = useRef(null);
  const { canEdit } = useRole();

  const loadTimeline = () => {
    return timelineApi.list(projectId)
      .then(setItems)
      .catch(() => setItems([]));
  };

  const loadSchedule = () => {
    return scheduleApi.list(projectId)
      .then((data) => {
        setScheduleData(data);
        if (data.length > 0) setMode('gantt');
      })
      .catch(() => setScheduleData([]));
  };

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    Promise.all([loadTimeline(), loadSchedule()])
      .finally(() => setLoading(false));
  }, [projectId]);

  const handleAdd = async (data) => {
    await timelineApi.create(projectId, data);
    setShowAddModal(false);
    loadTimeline();
  };

  const handleEdit = async (data) => {
    await timelineApi.update(projectId, editingId, data);
    setEditingId(null);
    loadTimeline();
  };

  const handleDelete = async (id) => {
    await timelineApi.remove(projectId, id);
    loadTimeline();
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    setUploadError('');
    try {
      await scheduleApi.upload(projectId, file);
      await loadSchedule();
    } catch (err) {
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const hasSchedule = scheduleData.length > 0;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-5 flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-textpri" style={{ fontFamily: "'Syne', 'Inter', sans-serif" }}>Project Timeline</h2>
          <p className="text-sm text-textsec mt-1">Milestones, progress updates and uploaded schedules</p>
        </div>
        <div className="flex items-center gap-2">
          {hasSchedule && (
            <button
              onClick={() => setMode(mode === 'gantt' ? 'manual' : 'gantt')}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-textpri hover:bg-appbg transition"
            >
              {mode === 'gantt' ? 'Milestones' : 'Gantt Chart'}
            </button>
          )}
          {canEdit && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="rounded-lg bg-[#2C97D4] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2286be] transition disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Upload Schedule'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleUpload}
                className="hidden"
              />
            </>
          )}
          {canEdit && mode === 'manual' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-textpri hover:bg-appbg transition"
            >
              + Add Item
            </button>
          )}
        </div>
      </div>

      {/* Upload error */}
      {uploadError && (
        <div className="rounded-lg border border-error/30 bg-error/5 px-3 py-2 mb-4 text-xs text-error">
          {uploadError}
        </div>
      )}

      {/* Gantt Chart View */}
      {mode === 'gantt' && hasSchedule && (
        <div className="mb-6 rounded-lg border border-border bg-surface p-4 overflow-hidden">
          <GanttChart data={scheduleData} />
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl shadow-2xl border border-border bg-surface overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="text-base font-semibold text-textpri" style={{ fontFamily: "'Syne', 'Inter', sans-serif" }}>
                Add Timeline Item
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-textsec hover:text-textpri hover:bg-appbg transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-5">
              <TimelineForm
                initial={null}
                onSave={handleAdd}
                onCancel={() => setShowAddModal(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Manual Timeline View */}
      {mode === 'manual' && (
        <>
          {items.length === 0 ? (
            <EmptyState title="No timeline items yet" description="Add milestones and progress updates to track this project." />
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item._id}>
                  {/* Inline edit form */}
                  {editingId === item._id ? (
                    <div className="rounded-xl border border-[#2C97D4]/30 bg-surface p-4 shadow-card">
                      <p className="text-xs font-semibold text-[#2C97D4] mb-3 uppercase tracking-wide">Editing: {item.title}</p>
                      <TimelineForm
                        initial={item}
                        onSave={handleEdit}
                        onCancel={() => setEditingId(null)}
                      />
                    </div>
                  ) : (
                    <div className="flex items-start gap-4 rounded-xl border border-border bg-surface p-4 shadow-card hover:shadow-card-hover transition-shadow">
                      <div className="flex-shrink-0 mt-1">
                        <div className="h-3 w-3 rounded-full bg-[#2C97D4]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-textpri">{item.title}</span>
                          <Badge label={item.type?.replace('_', ' ')} variant={item.type} />
                        </div>
                        {item.description && (
                          <p className="text-xs text-textsec mb-1">{item.description}</p>
                        )}
                        <span className="text-xs text-texttert">
                          {new Date(item.date).toLocaleDateString()}
                        </span>
                      </div>
                      {canEdit && (
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => setEditingId(item._id)}
                            className="p-1.5 rounded-lg text-textsec hover:text-[#2C97D4] hover:bg-[#2C97D4]/8 transition-colors"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(item._id)}
                            className="p-1.5 rounded-lg text-textsec hover:text-error hover:bg-error/8 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
