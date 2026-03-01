import { useEffect, useState } from 'react';
import { hseApi } from '../../../services/api';
import { useRole } from '../../hooks/useRole';
import Badge from '../../ui/Badge';
import EmptyState from '../../ui/EmptyState';
import LoadingSpinner from '../../ui/LoadingSpinner';
import HSEForm from './HSEForm';

export default function HSEList({ projectId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const { canEdit } = useRole();

  const load = () => {
    setLoading(true);
    hseApi.list(projectId)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (projectId) load(); }, [projectId]);

  const handleSave = async (data) => {
    if (editing) {
      await hseApi.update(projectId, editing._id, data);
    } else {
      await hseApi.create(projectId, data);
    }
    setShowForm(false);
    setEditing(null);
    load();
  };

  const handleDelete = async (id) => {
    await hseApi.remove(projectId, id);
    load();
  };

  const handleClear = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to clear all HSE data for this project? This cannot be undone.'
    );
    if (!confirmed) return;

    try {
      await hseApi.clear(projectId);
      setItems([]);
    } catch (err) {
      alert(err.message || 'Failed to clear data');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[#111827]">HSE Incidents</h2>
        {canEdit && (
          <div className="flex gap-2 items-center">
            {items.length > 0 && (
              <button
                onClick={handleClear}
                className="text-sm text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition"
                disabled={loading}
              >
                Clear Data
              </button>
            )}
            <button
              onClick={() => { setEditing(null); setShowForm(true); }}
              className="rounded-xl border border-[#E6EAF0] bg-white px-3 py-2 text-xs font-semibold text-[#374151] hover:bg-[#F9FAFB] transition"
            >
              + Report Incident
            </button>
            <label className="cursor-pointer rounded-xl border border-[#E6EAF0] bg-white px-3 py-2 text-xs font-semibold text-[#374151] hover:bg-[#F9FAFB] transition">
              Import CSV
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={async (e) => {
                  if (e.target.files?.[0]) {
                    try {
                      setLoading(true);
                      const res = await hseApi.importCsv(projectId, e.target.files[0]);
                      alert(`Imported ${res.importedCount} incidents successfully.`);
                      load();
                    } catch (err) {
                      alert('Import failed: ' + err.message);
                      setLoading(false);
                    }
                    e.target.value = ''; // Reset input
                  }
                }}
              />
            </label>
          </div>
        )}
      </div>

      {
        showForm && (
          <HSEForm
            initial={editing}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditing(null); }}
          />
        )
      }

      {
        items.length === 0 ? (
          <EmptyState title="No HSE incidents" description="No health, safety, or environmental incidents recorded." />
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item._id} className="flex items-start gap-3 rounded-xl border border-[#E6EAF0] bg-[#F9FAFB] p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge label={item.severity} variant={item.severity} />
                    <span className="text-sm font-semibold text-[#111827]">{item.title}</span>
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
                    <button onClick={() => { setEditing(item); setShowForm(true); }} className="text-xs text-[#2563EB] hover:underline">Edit</button>
                    <button onClick={() => handleDelete(item._id)} className="text-xs text-[#EF4444] hover:underline">Delete</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      }
    </div >
  );
}
