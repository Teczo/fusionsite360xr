import { useState } from 'react';

const TYPES = ['milestone', 'incident', 'progress_update'];

export default function TimelineForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({
    title: initial?.title || '',
    description: initial?.description || '',
    date: initial?.date ? new Date(initial.date).toISOString().split('T')[0] : '',
    type: initial?.type || 'progress_update',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title || !form.date) return;
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-[#D7E6FF] bg-[#EAF2FF] p-4 mb-4 space-y-3">
      <input
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        placeholder="Title"
        required
        className="w-full rounded-lg border border-[#E6EAF0] bg-white px-3 py-2 text-sm text-[#111827] outline-none focus:ring-2 focus:ring-[#2563EB]/20"
      />
      <textarea
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        placeholder="Description (optional)"
        rows={2}
        className="w-full rounded-lg border border-[#E6EAF0] bg-white px-3 py-2 text-sm text-[#111827] outline-none focus:ring-2 focus:ring-[#2563EB]/20 resize-none"
      />
      <div className="flex gap-3">
        <input
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          required
          className="flex-1 rounded-lg border border-[#E6EAF0] bg-white px-3 py-2 text-sm text-[#111827] outline-none focus:ring-2 focus:ring-[#2563EB]/20"
        />
        <select
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
          className="flex-1 rounded-lg border border-[#E6EAF0] bg-white px-3 py-2 text-sm text-[#111827] outline-none focus:ring-2 focus:ring-[#2563EB]/20"
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>{t.replace('_', ' ')}</option>
          ))}
        </select>
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-[#E6EAF0] bg-white px-4 py-2 text-xs font-semibold text-[#374151] hover:bg-[#F9FAFB]"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1D4ED8]"
        >
          {initial ? 'Update' : 'Create'}
        </button>
      </div>
    </form>
  );
}
