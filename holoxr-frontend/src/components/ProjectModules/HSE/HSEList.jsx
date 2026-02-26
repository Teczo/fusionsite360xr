import { useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { hseApi } from '../../../services/api';
import { useRole } from '../../hooks/useRole';
import Badge from '../../ui/Badge';
import EmptyState from '../../ui/EmptyState';
import LoadingSpinner from '../../ui/LoadingSpinner';
import HSEForm from './HSEForm';

export default function HSEList({ projectId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const { canEdit } = useRole();

  const load = () => {
    setLoading(true);
    hseApi.list(projectId)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (projectId) load(); }, [projectId]);

  const handleAdd = async (data) => {
    await hseApi.create(projectId, data);
    setShowAddModal(false);
    load();
  };

  const handleEdit = async (data) => {
    await hseApi.update(projectId, editingId, data);
    setEditingId(null);
    load();
  };

  const handleDelete = async (id) => {
    await hseApi.remove(projectId, id);
    load();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-textpri" style={{ fontFamily: "'Syne', 'Inter', sans-serif" }}>HSE Incidents</h2>
          <p className="text-sm text-textsec mt-1">Health, safety &amp; environmental incident records</p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="rounded-lg bg-[#2C97D4] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2286be] transition"
            >
              + Report Incident
            </button>
            <label className="cursor-pointer rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-textpri hover:bg-appbg transition">
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
                    e.target.value = '';
                  }
                }}
              />
            </label>
          </div>
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
                Report Incident
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-textsec hover:text-textpri hover:bg-appbg transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-5">
              <HSEForm
                initial={null}
                onSave={handleAdd}
                onCancel={() => setShowAddModal(false)}
              />
            </div>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState title="No HSE incidents" description="No health, safety, or environmental incidents recorded." />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item._id}>
              {editingId === item._id ? (
                <div className="rounded-xl border border-[#2C97D4]/30 bg-surface p-4 shadow-card">
                  <p className="text-xs font-semibold text-[#2C97D4] mb-3 uppercase tracking-wide">Editing: {item.title}</p>
                  <HSEForm
                    initial={item}
                    onSave={handleEdit}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              ) : (
                <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4 shadow-card hover:shadow-card-hover transition-shadow">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge label={item.severity} variant={item.severity} />
                      <span className="text-sm font-semibold text-textpri">{item.title}</span>
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
    </div>
  );
}
