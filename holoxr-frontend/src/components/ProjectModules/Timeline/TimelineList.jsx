import { useEffect, useRef, useState } from 'react';
import { timelineApi, scheduleApi, assignmentApi, materialApi, costApi } from '../../../services/api';
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
  const [view, setView] = useState("gantt"); // gantt | cost | resources | materials
  const [costData, setCostData] = useState([]);
  const [assignmentData, setAssignmentData] = useState([]);
  const [materialData, setMaterialData] = useState([]);

  const fileInputRef = useRef(null);
  const costInputRef = useRef(null);
  const assignmentInputRef = useRef(null);
  const materialInputRef = useRef(null);
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

  const loadCosts = () => costApi.list(projectId).then(setCostData).catch(() => setCostData([]));
  const loadAssignments = () => assignmentApi.list(projectId).then(setAssignmentData).catch(() => setAssignmentData([]));
  const loadMaterials = () => materialApi.list(projectId).then(setMaterialData).catch(() => setMaterialData([]));

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    Promise.all([
      loadTimeline(),
      loadSchedule(),
      loadCosts(),
      loadAssignments(),
      loadMaterials()
    ]).finally(() => setLoading(false));
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

  const handleUploadCost = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    setUploadError('');
    try {
      await costApi.upload(projectId, file);
      await loadCosts();
    } catch (err) {
      setUploadError(err.message || "Cost upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleUploadAssignment = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    setUploadError('');
    try {
      await assignmentApi.upload(projectId, file);
      await loadAssignments();
    } catch (err) {
      setUploadError(err.message || "Assignment upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleUploadMaterial = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    setUploadError('');
    try {
      await materialApi.upload(projectId, file);
      await loadMaterials();
    } catch (err) {
      setUploadError(err.message || "Material upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleClearSchedule = async () => {
    if (!window.confirm('Are you sure you want to clear all Schedule data for this project? This cannot be undone.')) return;
    try {
      await scheduleApi.clear(projectId);
      setScheduleData([]);
      setMode('manual');
    } catch (err) {
      setUploadError(err.message || 'Failed to clear data');
    }
  };

  const handleClearCost = async () => {
    if (!window.confirm('Are you sure you want to clear all Cost data for this project? This cannot be undone.')) return;
    try {
      await costApi.clear(projectId);
      setCostData([]);
    } catch (err) {
      setUploadError(err.message || 'Failed to clear data');
    }
  };

  const handleClearAssignment = async () => {
    if (!window.confirm('Are you sure you want to clear all Assignment data for this project? This cannot be undone.')) return;
    try {
      await assignmentApi.clear(projectId);
      setAssignmentData([]);
    } catch (err) {
      setUploadError(err.message || 'Failed to clear data');
    }
  };

  const handleClearMaterial = async () => {
    if (!window.confirm('Are you sure you want to clear all Material data for this project? This cannot be undone.')) return;
    try {
      await materialApi.clear(projectId);
      setMaterialData([]);
    } catch (err) {
      setUploadError(err.message || 'Failed to clear data');
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
          {view === 'gantt' && hasSchedule && (
            <button
              onClick={() => setMode(mode === 'gantt' ? 'manual' : 'gantt')}
              className="rounded-xl border border-[#E6EAF0] bg-white px-3 py-2 text-xs font-semibold text-[#374151] hover:bg-[#F9FAFB] transition"
            >
              {mode === 'gantt' ? 'Milestones' : 'Gantt Chart'}
            </button>
          )}
          {canEdit && view === 'gantt' && (
            <>
              {hasSchedule && (
                <button
                  onClick={handleClearSchedule}
                  className="text-sm text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition shrink-0"
                  disabled={uploading}
                >
                  Clear Data
                </button>
              )}
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
          {canEdit && view === 'gantt' && mode === 'manual' && (
            <button
              onClick={() => { setEditing(null); setShowForm(true); }}
              className="rounded-xl border border-[#E6EAF0] bg-white px-3 py-2 text-xs font-semibold text-[#374151] hover:bg-[#F9FAFB] transition"
            >
              + Add Item
            </button>
          )}
          {canEdit && view === 'cost' && (
            <>
              {costData.length > 0 && (
                <button
                  onClick={handleClearCost}
                  className="text-sm text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition shrink-0"
                  disabled={uploading}
                >
                  Clear Data
                </button>
              )}
              <button onClick={() => costInputRef.current?.click()} className="rounded-xl border border-[#2563EB] bg-[#2563EB] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1D4ED8] transition disabled:opacity-50">
                {uploading ? "Uploading..." : "Upload Cost"}
              </button>
              <input ref={costInputRef} type="file" accept=".csv" onChange={handleUploadCost} className="hidden" />
            </>
          )}
          {canEdit && view === 'resources' && (
            <>
              {assignmentData.length > 0 && (
                <button
                  onClick={handleClearAssignment}
                  className="text-sm text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition shrink-0"
                  disabled={uploading}
                >
                  Clear Data
                </button>
              )}
              <button onClick={() => assignmentInputRef.current?.click()} className="rounded-xl border border-[#2563EB] bg-[#2563EB] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1D4ED8] transition disabled:opacity-50">
                {uploading ? "Uploading..." : "Upload Assignments"}
              </button>
              <input ref={assignmentInputRef} type="file" accept=".csv" onChange={handleUploadAssignment} className="hidden" />
            </>
          )}
          {canEdit && view === 'materials' && (
            <>
              {materialData.length > 0 && (
                <button
                  onClick={handleClearMaterial}
                  className="text-sm text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition shrink-0"
                  disabled={uploading}
                >
                  Clear Data
                </button>
              )}
              <button onClick={() => materialInputRef.current?.click()} className="rounded-xl border border-[#2563EB] bg-[#2563EB] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1D4ED8] transition disabled:opacity-50">
                {uploading ? "Uploading..." : "Upload Materials"}
              </button>
              <input ref={materialInputRef} type="file" accept=".csv" onChange={handleUploadMaterial} className="hidden" />
            </>
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
      {view === 'gantt' && mode === 'gantt' && hasSchedule && (
        <div className="mb-6 rounded-xl border border-[#E6EAF0] bg-white p-4 overflow-hidden">
          <GanttChart data={scheduleData} />
        </div>
      )}

      {/* Manual Timeline View */}
      {view === 'gantt' && mode === 'manual' && (
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

      {/* ================= COST VIEW ================= */}
      {view === "cost" && (
        <div className="p-4">
          {costData.length === 0 ? (
            <EmptyState
              title="No cost data"
              description="Upload a CSV to see cost intelligence."
            />
          ) : (
            <div className="overflow-auto max-h-[420px]">
              <table className="w-full text-sm">
                <thead className="bg-[#F9FAFB] sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-medium text-[#4B5563]">Category</th>
                    <th className="text-right p-2 font-medium text-[#4B5563]">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {costData.map((c, i) => (
                    <tr key={i} className="border-t border-[#E6EAF0]">
                      <td className="p-2 text-[#111827]">{c.category || c.code || 'N/A'}</td>
                      <td className="p-2 text-right text-[#111827]">{c.amount || c.actualCost || c.total || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================= RESOURCES VIEW ================= */}
      {view === "resources" && (
        <div className="p-4">
          {assignmentData.length === 0 ? (
            <EmptyState
              title="No assignment data"
              description="Upload a CSV to see discipline responsibilities and contractors."
            />
          ) : (
            <div className="overflow-auto max-h-[420px]">
              <table className="w-full text-sm">
                <thead className="bg-[#F9FAFB] sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-medium text-[#4B5563]">Discipline</th>
                    <th className="text-left p-2 font-medium text-[#4B5563]">Contractor</th>
                    <th className="text-left p-2 font-medium text-[#4B5563]">Responsible</th>
                    <th className="text-left p-2 font-medium text-[#4B5563]">Zone</th>
                    <th className="text-left p-2 font-medium text-[#4B5563]">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {assignmentData.map((a, i) => (
                    <tr key={i} className="border-t border-[#E6EAF0]">
                      <td className="p-2 font-medium text-[#111827]">{a.discipline}</td>
                      <td className="p-2 text-[#4B5563]">{a.contractor}</td>
                      <td className="p-2 text-[#4B5563]">{a.responsiblePerson}</td>
                      <td className="p-2 text-[#4B5563]">{a.zone}</td>
                      <td className="p-2">
                        <Badge variant={a.status?.toLowerCase() === 'active' ? 'success' : 'default'} label={a.status || 'N/A'} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================= MATERIALS VIEW ================= */}
      {view === "materials" && (
        <div className="p-4">
          {materialData.length === 0 ? (
            <EmptyState
              title="No material data"
              description="Upload a CSV to see material quantities by level."
            />
          ) : (
            <div className="overflow-auto max-h-[420px]">
              <table className="w-full text-sm">
                <thead className="bg-[#F9FAFB] sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-medium text-[#4B5563]">Level</th>
                    <th className="text-left p-2 font-medium text-[#4B5563]">Material</th>
                    <th className="text-right p-2 font-medium text-[#4B5563]">Quantity</th>
                    <th className="text-left p-2 font-medium text-[#4B5563]">Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {materialData.map((m, i) => (
                    <tr key={i} className="border-t border-[#E6EAF0]">
                      <td className="p-2 font-medium text-[#111827]">{m.level}</td>
                      <td className="p-2 text-[#4B5563]">{m.materialType}</td>
                      <td className="p-2 text-right text-[#111827]">{m.quantity?.toLocaleString()}</td>
                      <td className="p-2 text-[#9CA3AF]">{m.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex border-t border-[#E6EAF0] mt-4 rounded-b-xl overflow-hidden">
        <button onClick={() => setView("gantt")}
          className={`flex-1 py-3 text-sm font-semibold transition ${view === "gantt" ? "bg-[#EEF2FF] text-[#2563EB]" : "text-[#6B7280] hover:bg-[#F9FAFB] bg-white"
            }`}>
          Timeline
        </button>
        <button onClick={() => setView("cost")}
          className={`flex-1 py-3 text-sm font-semibold transition border-l border-[#E6EAF0] ${view === "cost" ? "bg-[#EEF2FF] text-[#2563EB]" : "text-[#6B7280] hover:bg-[#F9FAFB] bg-white"
            }`}>
          Cost Intelligence
        </button>
        <button onClick={() => setView("resources")}
          className={`flex-1 py-3 text-sm font-semibold transition border-l border-[#E6EAF0] ${view === "resources" ? "bg-[#EEF2FF] text-[#2563EB]" : "text-[#6B7280] hover:bg-[#F9FAFB] bg-white"
            }`}>
          Resources
        </button>
        <button onClick={() => setView("materials")}
          className={`flex-1 py-3 text-sm font-semibold transition border-l border-[#E6EAF0] ${view === "materials" ? "bg-[#EEF2FF] text-[#2563EB]" : "text-[#6B7280] hover:bg-[#F9FAFB] bg-white"
            }`}>
          Materials
        </button>
      </div>

    </div>
  );
}
