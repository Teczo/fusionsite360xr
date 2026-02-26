import { useState } from 'react';

const SEVERITIES = ['Critical', 'Warning', 'Info'];
const SOURCES = ['manual', 'iot'];

export default function AlertForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({
    title: initial?.title || '',
    severity: initial?.severity || 'Info',
    source: initial?.source || 'manual',
    date: initial?.date ? new Date(initial.date).toISOString().split('T')[0] : '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title || !form.severity || !form.date) return;
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        placeholder="Alert Title"
        required
        className="w-full rounded-lg border border-border bg-appbg px-3 py-2 text-sm text-textpri outline-none focus:ring-2 focus:ring-[#2C97D4]/20 focus:border-[#2C97D4]/40"
      />
      <div className="flex gap-3">
        <input
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          required
          className="flex-1 rounded-lg border border-border bg-appbg px-3 py-2 text-sm text-textpri outline-none focus:ring-2 focus:ring-[#2C97D4]/20 focus:border-[#2C97D4]/40"
        />
        <select
          value={form.severity}
          onChange={(e) => setForm({ ...form, severity: e.target.value })}
          className="flex-1 rounded-lg border border-border bg-appbg px-3 py-2 text-sm text-textpri outline-none focus:ring-2 focus:ring-[#2C97D4]/20"
        >
          {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={form.source}
          onChange={(e) => setForm({ ...form, source: e.target.value })}
          className="flex-1 rounded-lg border border-border bg-appbg px-3 py-2 text-sm text-textpri outline-none focus:ring-2 focus:ring-[#2C97D4]/20"
        >
          {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg border border-border bg-surface px-4 py-2 text-xs font-semibold text-textpri hover:bg-appbg">Cancel</button>
        <button type="submit" className="rounded-lg bg-[#2C97D4] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2286be]">{initial ? 'Update' : 'Create'}</button>
      </div>
    </form>
  );
}
