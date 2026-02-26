import { useState } from 'react';

function CurveInput({ label, points, onChange, color }) {
  const addPoint = () => {
    onChange([...points, { date: '', value: 0 }]);
  };
  const removePoint = (idx) => {
    onChange(points.filter((_, i) => i !== idx));
  };
  const updatePoint = (idx, field, val) => {
    const updated = [...points];
    updated[idx] = { ...updated[idx], [field]: field === 'value' ? Number(val) : val };
    onChange(updated);
  };

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-sm font-semibold text-textpri">{label}</span>
        <button
          type="button"
          onClick={addPoint}
          className="ml-auto text-xs text-accent hover:underline"
        >
          + Add Point
        </button>
      </div>
      <div className="space-y-2">
        {points.map((p, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input
              type="date"
              value={p.date ? new Date(p.date).toISOString().split('T')[0] : ''}
              onChange={(e) => updatePoint(idx, 'date', e.target.value)}
              className="flex-1 rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-textpri outline-none"
            />
            <input
              type="number"
              min="0"
              max="100"
              value={p.value}
              onChange={(e) => updatePoint(idx, 'value', e.target.value)}
              className="w-20 rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-textpri outline-none"
              placeholder="%"
            />
            <button
              type="button"
              onClick={() => removePoint(idx)}
              className="text-xs text-error hover:underline"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SCurveEditor({ data, onSave, onCancel }) {
  const [baseline, setBaseline] = useState(data.baseline || []);
  const [actual, setActual] = useState(data.actual || []);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ baseline, actual });
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-brand-100 bg-brand-50 p-4 space-y-4">
      <CurveInput label="Baseline" points={baseline} onChange={setBaseline} color="#9CA3AF" />
      <CurveInput label="Actual" points={actual} onChange={setActual} color="#2563EB" />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg border border-border bg-surface px-4 py-2 text-xs font-semibold text-textpri hover:bg-appbg">Cancel</button>
        <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white hover:bg-accent/90">Save</button>
      </div>
    </form>
  );
}
