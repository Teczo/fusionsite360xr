import { useState } from 'react';

const SEVERITIES     = ['Critical', 'Warning', 'Info'];
const INCIDENT_TYPES = ['', 'Near Miss', 'First Aid', 'Medical Treatment', 'Lost Time Injury', 'Fatality', 'Property Damage', 'Environmental'];
const STATUSES       = ['Open', 'Closed'];
const PERMIT_TYPES   = ['', 'Work at Height', 'Confined Space', 'Hot Work', 'Heavy Lifting', 'Excavation'];
const COMP_CATS      = ['', 'PPE Violation', 'Housekeeping', 'Work at Height', 'Electrical', 'Lifting', 'Other'];

const field = 'w-full rounded-lg border border-[#E6EAF0] bg-white px-3 py-2 text-sm text-[#111827] outline-none focus:ring-2 focus:ring-[#EF4444]/20';
const label = 'text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide mb-1';

export default function HSEForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({
    title:              initial?.title || '',
    description:        initial?.description || '',
    severity:           initial?.severity || 'Info',
    date:               initial?.date ? new Date(initial.date).toISOString().split('T')[0] : '',
    zoneId:             initial?.zoneId || '',
    incidentType:       initial?.incidentType || '',
    isLTI:              initial?.isLTI || false,
    manhours:           initial?.manhours || '',
    status:             initial?.status || 'Open',
    subcontractor:      initial?.subcontractor || '',
    supervisor:         initial?.supervisor || '',
    permitType:         initial?.permitType || '',
    permitActive:       initial?.permitActive || false,
    complianceCategory: initial?.complianceCategory || '',
    closedAt:           initial?.closedAt ? new Date(initial.closedAt).toISOString().split('T')[0] : '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title || !form.severity || !form.date) return;
    onSave({
      ...form,
      manhours: form.manhours !== '' ? Number(form.manhours) : 0,
      closedAt: form.status === 'Closed' && form.closedAt ? form.closedAt : null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] p-5 mb-4 space-y-4">

      {/* Row 1: Title */}
      <div>
        <p className={label}>Incident Title *</p>
        <input value={form.title} onChange={e => set('title', e.target.value)}
          placeholder="e.g. Worker slip on wet floor — Zone A" required className={field} />
      </div>

      {/* Row 2: Description */}
      <div>
        <p className={label}>Description</p>
        <textarea value={form.description} onChange={e => set('description', e.target.value)}
          placeholder="Details, root cause, corrective actions..." rows={2}
          className={`${field} resize-none`} />
      </div>

      {/* Row 3: Date | Severity | Incident Type */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className={label}>Date *</p>
          <input type="date" value={form.date} onChange={e => set('date', e.target.value)}
            required className={field} />
        </div>
        <div>
          <p className={label}>Severity *</p>
          <select value={form.severity} onChange={e => set('severity', e.target.value)} className={field}>
            {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <p className={label}>Incident Type</p>
          <select value={form.incidentType} onChange={e => set('incidentType', e.target.value)} className={field}>
            {INCIDENT_TYPES.map(t => <option key={t} value={t}>{t || '— Select —'}</option>)}
          </select>
        </div>
      </div>

      {/* Row 4: Status | Zone | Manhours */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className={label}>Status</p>
          <select value={form.status} onChange={e => set('status', e.target.value)} className={field}>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <p className={label}>Zone ID</p>
          <input value={form.zoneId} onChange={e => set('zoneId', e.target.value)}
            placeholder="e.g. Zone A" className={field} />
        </div>
        <div>
          <p className={label}>Manhours at Risk</p>
          <input type="number" min="0" value={form.manhours} onChange={e => set('manhours', e.target.value)}
            placeholder="0" className={field} />
        </div>
      </div>

      {/* Row 5: Subcontractor | Supervisor */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className={label}>Subcontractor</p>
          <input value={form.subcontractor} onChange={e => set('subcontractor', e.target.value)}
            placeholder="e.g. Bumi Armada" className={field} />
        </div>
        <div>
          <p className={label}>Supervisor</p>
          <input value={form.supervisor} onChange={e => set('supervisor', e.target.value)}
            placeholder="e.g. Ahmad bin Hassan" className={field} />
        </div>
      </div>

      {/* Row 6: Permit Type | Compliance Category */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className={label}>Permit Type</p>
          <select value={form.permitType} onChange={e => set('permitType', e.target.value)} className={field}>
            {PERMIT_TYPES.map(t => <option key={t} value={t}>{t || '— None —'}</option>)}
          </select>
        </div>
        <div>
          <p className={label}>Compliance Category</p>
          <select value={form.complianceCategory} onChange={e => set('complianceCategory', e.target.value)} className={field}>
            {COMP_CATS.map(c => <option key={c} value={c}>{c || '— None —'}</option>)}
          </select>
        </div>
      </div>

      {/* Row 7: Checkboxes + Closed At */}
      <div className="flex items-center gap-6 flex-wrap">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.isLTI} onChange={e => set('isLTI', e.target.checked)}
            className="w-4 h-4 rounded accent-red-600" />
          <span className="text-sm font-semibold text-[#DC2626]">Lost Time Injury (LTI)</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.permitActive} onChange={e => set('permitActive', e.target.checked)}
            className="w-4 h-4 rounded accent-amber-500" />
          <span className="text-sm text-[#374151]">Permit Active</span>
        </label>
        {form.status === 'Closed' && (
          <div className="flex items-center gap-2">
            <span className={`${label} mb-0`}>Closed On</span>
            <input type="date" value={form.closedAt} onChange={e => set('closedAt', e.target.value)}
              className="rounded-lg border border-[#E6EAF0] bg-white px-3 py-1.5 text-sm text-[#111827] outline-none focus:ring-2 focus:ring-[#EF4444]/20" />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel}
          className="rounded-lg border border-[#E6EAF0] bg-white px-4 py-2 text-xs font-semibold text-[#374151] hover:bg-[#F9FAFB]">
          Cancel
        </button>
        <button type="submit"
          className="rounded-lg bg-[#EF4444] px-4 py-2 text-xs font-semibold text-white hover:bg-[#DC2626]">
          {initial ? 'Update' : 'Report Incident'}
        </button>
      </div>
    </form>
  );
}
