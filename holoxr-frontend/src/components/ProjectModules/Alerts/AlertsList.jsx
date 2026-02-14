import { useEffect, useState } from 'react';
import { alertsApi } from '../../../services/api';
import { useRole } from '../../hooks/useRole';
import Badge from '../../ui/Badge';
import EmptyState from '../../ui/EmptyState';
import LoadingSpinner from '../../ui/LoadingSpinner';
import AlertForm from './AlertForm';

export default function AlertsList({ projectId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const { canEdit } = useRole();

  const load = () => {
    setLoading(true);
    alertsApi.list(projectId)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
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

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[#111827]">Alerts</h2>
        {canEdit && (
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="rounded-xl border border-[#E6EAF0] bg-white px-3 py-2 text-xs font-semibold text-[#374151] hover:bg-[#F9FAFB] transition"
          >
            + Add Alert
          </button>
        )}
      </div>

      {showForm && (
        <AlertForm
          initial={editing}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}

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
    </div>
  );
}
