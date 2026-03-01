import { useEffect, useRef, useState } from 'react';
import { alertsApi, issuesApi } from '../../../services/api';
import { useRole } from '../../hooks/useRole';
import Badge from '../../ui/Badge';
import EmptyState from '../../ui/EmptyState';
import LoadingSpinner from '../../ui/LoadingSpinner';
import AlertForm from './AlertForm';

export default function AlertsList({ projectId }) {
  const [items, setItems] = useState([]);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [tab, setTab] = useState('issues'); // 'alerts' | 'issues'
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const issueInputRef = useRef(null);

  const { canEdit } = useRole();

  const load = () => {
    setLoading(true);
    Promise.all([
      alertsApi.list(projectId).then(setItems).catch(() => setItems([])),
      issuesApi.list(projectId).then(setIssues).catch(() => setIssues([]))
    ]).finally(() => setLoading(false));
  };

  useEffect(() => { if (projectId) load(); }, [projectId]);

  const handleSave = async (data) => {
    if (editing) {
      await alertsApi.update(projectId, editing._id, data);
    } else {
      await alertsApi.create(projectId, data);
    }
    setShowForm(false);
    setEditing(null);
    load();
  };

  const handleDelete = async (id) => {
    await alertsApi.remove(projectId, id);
    load();
  };

  const handleUploadIssue = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    setUploadError('');
    try {
      await issuesApi.upload(projectId, file);
      await load();
    } catch (err) {
      setUploadError(err.message || 'Issue upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleClearIssues = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to clear all Issues for this project? This cannot be undone.'
    );
    if (!confirmed) return;

    try {
      await issuesApi.clear(projectId);
      setIssues([]);
    } catch (err) {
      setUploadError(err.message || 'Failed to clear data');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[#111827]">
          {tab === 'alerts' ? 'Project Alerts' : 'Project Issues'}
        </h2>
        {canEdit && tab === 'alerts' && (
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="rounded-xl border border-[#E6EAF0] bg-white px-3 py-2 text-xs font-semibold text-[#374151] hover:bg-[#F9FAFB] transition"
          >
            + Add Alert
          </button>
        )}
        {canEdit && tab === 'issues' && (
          <div className="flex items-center gap-2">
            {issues.length > 0 && (
              <button
                onClick={handleClearIssues}
                className="text-sm text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition"
                disabled={uploading}
              >
                Clear Data
              </button>
            )}
            <button
              onClick={() => issueInputRef.current?.click()}
              disabled={uploading}
              className="rounded-xl border border-[#2563EB] bg-[#2563EB] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1D4ED8] transition disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Upload Issues'}
            </button>
            <input
              ref={issueInputRef}
              type="file"
              accept=".csv"
              onChange={handleUploadIssue}
              className="hidden"
            />
          </div>
        )}
      </div>

      {uploadError && (
        <div className="rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] px-3 py-2 mb-4 text-xs text-[#B91C1C]">
          {uploadError}
        </div>
      )}

      {showForm && tab === 'alerts' && (
        <AlertForm
          initial={editing}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      {tab === 'alerts' && (
        <>
          {items.length === 0 ? (
            <EmptyState title="No alerts" description="No alerts have been raised for this project." />
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item._id} className="flex items-center gap-3 rounded-xl border border-[#E6EAF0] bg-[#F9FAFB] px-4 py-3">
                  <Badge label={item.severity} variant={item.severity} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-[#111827]">{item.title}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-[#9CA3AF]">{new Date(item.date).toLocaleDateString()}</span>
                      <span className="text-xs text-[#D1D5DB]">|</span>
                      <span className="text-xs text-[#9CA3AF]">{item.source}</span>
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => { setEditing(item); setShowForm(true); }} className="text-xs text-[#2563EB] hover:underline">Edit</button>
                      <button onClick={() => handleDelete(item._id)} className="text-xs text-[#EF4444] hover:underline">Delete</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'issues' && (
        <div className="space-y-2 overflow-auto max-h-[420px]">
          {issues.length === 0 ? (
            <EmptyState title="No issues" description="Upload issues CSV or create from 3D viewer." />
          ) : (
            issues.map((issue, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-[#E6EAF0] bg-[#F9FAFB]">
                <Badge variant={
                  issue.severity?.toLowerCase() === 'critical' ? 'destructive' :
                    issue.severity?.toLowerCase() === 'warning' ? 'warning' : 'default'
                } label={issue.severity || 'Normal'} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-[#111827] truncate">{issue.title}</p>
                  <p className="text-xs text-[#6B7280] mt-1">{issue.zoneId || issue.zone} · {issue.status}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex border-t border-[#E6EAF0] mt-4 rounded-b-xl overflow-hidden">
        <button onClick={() => setTab('alerts')}
          className={`flex-1 py-3 text-sm font-semibold transition ${tab === 'alerts' ? 'bg-[#EEF2FF] text-[#2563EB]' : 'text-[#6B7280] hover:bg-[#F9FAFB] bg-white'
            }`}>
          Alerts
        </button>
        <button onClick={() => setTab('issues')}
          className={`flex-1 py-3 text-sm font-semibold transition border-l border-[#E6EAF0] ${tab === 'issues' ? 'bg-[#EEF2FF] text-[#2563EB]' : 'text-[#6B7280] hover:bg-[#F9FAFB] bg-white'
            }`}>
          Issues
        </button>
      </div>
    </div>
  );
}
