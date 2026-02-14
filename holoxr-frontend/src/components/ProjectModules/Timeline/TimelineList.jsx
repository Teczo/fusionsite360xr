import { useEffect, useState } from 'react';
import { timelineApi } from '../../../services/api';
import { useRole } from '../../hooks/useRole';
import Badge from '../../ui/Badge';
import EmptyState from '../../ui/EmptyState';
import LoadingSpinner from '../../ui/LoadingSpinner';
import TimelineForm from './TimelineForm';

export default function TimelineList({ projectId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const { canEdit } = useRole();

  const load = () => {
    setLoading(true);
    timelineApi.list(projectId)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (projectId) load(); }, [projectId]);

  const handleSave = async (data) => {
    if (editing) {
      await timelineApi.update(projectId, editing._id, data);
    } else {
      await timelineApi.create(projectId, data);
    }
    setShowForm(false);
    setEditing(null);
    load();
  };

  const handleDelete = async (id) => {
    await timelineApi.remove(projectId, id);
    load();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[#111827]">Project Timeline</h2>
        {canEdit && (
          <button
            onClick={() => { setEditing(null); setShowForm(true); }}
            className="rounded-xl border border-[#E6EAF0] bg-white px-3 py-2 text-xs font-semibold text-[#374151] hover:bg-[#F9FAFB] transition"
          >
            + Add Item
          </button>
        )}
      </div>

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
    </div>
  );
}
