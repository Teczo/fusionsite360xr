import { useState } from 'react';

const SEVERITIES = ['Critical', 'Warning', 'Info'];

export default function HSEForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({
    title: initial?.title || '',
    description: initial?.description || '',
    severity: initial?.severity || 'Info',
    date: initial?.date ? new Date(initial.date).toISOString().split('T')[0] : '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title || !form.severity || !form.date) return;
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] p-4 mb-4 space-y-3">
      <input
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        placeholder="Incident Title"
        required
        className="w-full rounded-lg border border-[#E6EAF0] bg-white px-3 py-2 text-sm text-[#111827] outline-none focus:ring-2 focus:ring-[#EF4444]/20"
      />
      <textarea
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        placeholder="Description (optional)"
        rows={2}
        className="w-full rounded-lg border border-[#E6EAF0] bg-white px-3 py-2 text-sm text-[#111827] outline-none focus:ring-2 focus:ring-[#EF4444]/20 resize-none"
      />
      <div className="flex gap-3">
        <input
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          required
          className="flex-1 rounded-lg border border-[#E6EAF0] bg-white px-3 py-2 text-sm text-[#111827] outline-none focus:ring-2 focus:ring-[#EF4444]/20"
        />
        <select
          value={form.severity}
          onChange={(e) => setForm({ ...form, severity: e.target.value })}
          className="flex-1 rounded-lg border border-[#E6EAF0] bg-white px-3 py-2 text-sm text-[#111827] outline-none focus:ring-2 focus:ring-[#EF4444]/20"
        >
          {SEVERITIES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg border border-[#E6EAF0] bg-white px-4 py-2 text-xs font-semibold text-[#374151] hover:bg-[#F9FAFB]">Cancel</button>
        <button type="submit" className="rounded-lg bg-[#EF4444] px-4 py-2 text-xs font-semibold text-white hover:bg-[#DC2626]">{initial ? 'Update' : 'Report'}</button>
      </div>
    </form>
  );
}
