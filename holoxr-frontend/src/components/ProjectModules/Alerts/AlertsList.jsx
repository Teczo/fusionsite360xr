import { useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { alertsApi } from '../../../services/api';
import { useRole } from '../../hooks/useRole';
import Badge from '../../ui/Badge';
import EmptyState from '../../ui/EmptyState';
import LoadingSpinner from '../../ui/LoadingSpinner';
import AlertForm from './AlertForm';

export default function AlertsList({ projectId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const { canEdit } = useRole();

  const load = () => {
    setLoading(true);
    alertsApi.list(projectId)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (projectId) load(); }, [projectId]);

  const handleAdd = async (data) => {
    await alertsApi.create(projectId, data);
    setShowAddModal(false);
    load();
  };

  const handleEdit = async (data) => {
    await alertsApi.update(projectId, editingId, data);
    setEditingId(null);
    load();
  };

  const handleDelete = async (id) => {
    await alertsApi.remove(projectId, id);
    load();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-textpri" style={{ fontFamily: "'Syne', 'Inter', sans-serif" }}>Alerts</h2>
          <p className="text-sm text-textsec mt-1">Project alerts, warnings and notifications</p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowAddModal(true)}
            className="rounded-lg bg-[#2C97D4] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2286be] transition"
          >
            + Add Alert
          </button>
        )}
      </div>

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
                Add Alert
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-textsec hover:text-textpri hover:bg-appbg transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-5">
              <AlertForm
                initial={null}
                onSave={handleAdd}
                onCancel={() => setShowAddModal(false)}
              />
            </div>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState title="No alerts" description="No alerts have been raised for this project." />
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item._id}>
              {editingId === item._id ? (
                <div className="rounded-xl border border-[#2C97D4]/30 bg-surface p-4 shadow-card">
                  <p className="text-xs font-semibold text-[#2C97D4] mb-3 uppercase tracking-wide">Editing: {item.title}</p>
                  <AlertForm
                    initial={item}
                    onSave={handleEdit}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-card hover:shadow-card-hover transition-shadow">
                  <Badge label={item.severity} variant={item.severity} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-textpri">{item.title}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-texttert">{new Date(item.date).toLocaleDateString()}</span>
                      <span className="text-xs text-border">|</span>
                      <span className="text-xs text-texttert">{item.source}</span>
                    </div>
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
    </div>
  );
}
