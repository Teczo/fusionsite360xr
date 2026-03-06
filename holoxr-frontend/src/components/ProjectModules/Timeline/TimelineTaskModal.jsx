// Modal for adding/editing a timeline task (manual milestone/event)
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const TYPE_OPTIONS = [
  { value: 'milestone', label: 'Milestone' },
  { value: 'progress_update', label: 'Progress Update' },
  { value: 'incident', label: 'Incident' },
];

const empty = { title: '', description: '', date: '', type: 'milestone' };

export default function TimelineTaskModal({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initial) {
      setForm({
        title: initial.title || '',
        description: initial.description || '',
        date: initial.date ? initial.date.slice(0, 10) : '',
        type: initial.type || 'milestone',
      });
    } else {
      setForm(empty);
    }
    setError('');
  }, [initial]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required.'); return; }
    if (!form.date) { setError('Date is required.'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave(form);
    } catch (err) {
      setError(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-[#111827]">
            {initial ? 'Edit Timeline Item' : 'Add Timeline Item'}
          </h3>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition text-[#6B7280]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={set('title')}
              placeholder="e.g. Foundation pour complete"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-[#111827] placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#3BB2A5]/40 focus:border-[#3BB2A5] transition"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={set('description')}
              placeholder="Optional notes..."
              rows={3}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-[#111827] placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#3BB2A5]/40 focus:border-[#3BB2A5] transition resize-none"
            />
          </div>

          {/* Date + Type row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">
                Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={form.date}
                onChange={set('date')}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#3BB2A5]/40 focus:border-[#3BB2A5] transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">Type</label>
              <select
                value={form.type}
                onChange={set('type')}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#3BB2A5]/40 focus:border-[#3BB2A5] transition bg-white"
              >
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/60">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-[#6B7280] bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 text-sm font-semibold text-white bg-[#3BB2A5] rounded-xl hover:bg-[#2d9a8e] transition disabled:opacity-50"
          >
            {saving ? 'Saving…' : initial ? 'Save Changes' : 'Add Item'}
          </button>
        </div>
      </div>
    </div>
  );
}