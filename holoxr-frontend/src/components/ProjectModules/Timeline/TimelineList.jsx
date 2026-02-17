import { useEffect, useRef, useState } from 'react';
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
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
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

  const handleSave = async (data) => {
    if (editing) {
      await timelineApi.update(projectId, editing._id, data);
    } else {
      await timelineApi.create(projectId, data);
    }
    setShowForm(false);
    setEditing(null);
    loadTimeline();
  };

  const handleDelete = async (id) => {
    await timelineApi.remove(projectId, id);
    loadTimeline();
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so the same file can be re-selected
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
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-lg font-semibold text-[#111827]">Project Timeline</h2>
        <div className="flex items-center gap-2">
          {hasSchedule && (
            <button
              onClick={() => setMode(mode === 'gantt' ? 'manual' : 'gantt')}
              className="rounded-xl border border-[#E6EAF0] bg-white px-3 py-2 text-xs font-semibold text-[#374151] hover:bg-[#F9FAFB] transition"
            >
              {mode === 'gantt' ? 'Milestones' : 'Gantt Chart'}
            </button>
          )}
          {canEdit && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="rounded-xl border border-[#2563EB] bg-[#2563EB] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1D4ED8] transition disabled:opacity-50"
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
              onClick={() => { setEditing(null); setShowForm(true); }}
              className="rounded-xl border border-[#E6EAF0] bg-white px-3 py-2 text-xs font-semibold text-[#374151] hover:bg-[#F9FAFB] transition"
            >
              + Add Item
            </button>
          )}
        </div>
      </div>

      {/* Upload error */}
      {uploadError && (
        <div className="rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] px-3 py-2 mb-4 text-xs text-[#B91C1C]">
          {uploadError}
        </div>
      )}

      {/* Gantt Chart View */}
      {mode === 'gantt' && hasSchedule && (
        <div className="mb-6 rounded-xl border border-[#E6EAF0] bg-white p-4 overflow-hidden">
          <GanttChart data={scheduleData} />
        </div>
      )}

      {/* Manual Timeline View */}
      {mode === 'manual' && (
        <>
          {showForm && (
            <TimelineForm
              initial={editing}
              onSave={handleSave}
              onCancel={() => { setShowForm(false); setEditing(null); }}
            />
          )}

          {items.length === 0 ? (
            <EmptyState title="No timeline items yet" description="Add milestones and progress updates to track this project." />
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item._id} className="flex items-start gap-4 rounded-xl border border-[#E6EAF0] bg-[#F9FAFB] p-4">
                  <div className="flex-shrink-0 mt-1">
                    <div className="h-3 w-3 rounded-full bg-[#2563EB]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-[#111827]">{item.title}</span>
                      <Badge label={item.type?.replace('_', ' ')} variant={item.type} />
                    </div>
                    {item.description && (
                      <p className="text-xs text-[#6B7280] mb-1">{item.description}</p>
                    )}
                    <span className="text-xs text-[#9CA3AF]">
                      {new Date(item.date).toLocaleDateString()}
                    </span>
                  </div>
                  {canEdit && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => { setEditing(item); setShowForm(true); }}
                        className="text-xs text-[#2563EB] hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item._id)}
                        className="text-xs text-[#EF4444] hover:underline"
                      >
                        Delete
                      </button>
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
