import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { bimApi } from '../../services/api';

function fmtDate(v) {
  if (!v) return '—';
  try { return format(new Date(v), 'dd MMM yyyy'); } catch { return '—'; }
}

function fmtNum(v, unit = '') {
  if (v == null) return '—';
  return `${v}${unit}`;
}

function MetaRow({ label, value }) {
  return (
    <div className="flex justify-between items-start gap-2 py-1">
      <span className="text-white/50 text-xs shrink-0">{label}</span>
      <span className="text-white text-xs font-medium text-right break-all">{value || '—'}</span>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-4">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-white/30 mb-1 px-4">
        {title}
      </div>
      <div className="px-4 divide-y divide-white/5">{children}</div>
    </div>
  );
}

export default function BimMetadataPanel({ projectId, elementGuid, onClose }) {
  const [component, setComponent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const isOpen = Boolean(elementGuid);

  useEffect(() => {
    if (!elementGuid || !projectId) {
      setComponent(null);
      setNotFound(false);
      return;
    }

    setLoading(true);
    setNotFound(false);
    setComponent(null);

    bimApi.get(projectId, elementGuid)
      .then((data) => {
        setComponent(data);
      })
      .catch((err) => {
        if (err.message?.includes('not found') || err.message?.includes('404')) {
          setNotFound(true);
        } else {
          toast.error('Failed to load BIM metadata');
          setNotFound(true);
        }
      })
      .finally(() => setLoading(false));
  }, [projectId, elementGuid]);

  return (
    <div
      className={[
        'absolute top-0 right-0 h-full w-80 bg-black/60 backdrop-blur-sm border-l border-white/10 text-white',
        'flex flex-col transition-transform duration-300 z-10',
        isOpen ? 'translate-x-0' : 'translate-x-full',
      ].join(' ')}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
        <span className="text-sm font-semibold">BIM Metadata</span>
        <button
          onClick={onClose}
          className="text-white/50 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
          aria-label="Close panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto py-3">
        {loading && (
          <div className="px-4 py-8 text-center text-white/40 text-sm">
            Loading…
          </div>
        )}

        {!loading && notFound && (
          <div className="px-4 py-8 text-center text-white/40 text-sm">
            No BIM metadata available for this element.
          </div>
        )}

        {!loading && component && (
          <>
            <Section title="General">
              <MetaRow label="Name"       value={component.element_name} />
              <MetaRow label="GUID"       value={component.element_guid} />
              <MetaRow label="Category"   value={component.category} />
              <MetaRow label="Subcategory" value={component.subcategory} />
              <MetaRow label="Discipline" value={component.discipline} />
              <MetaRow label="Phase"      value={component.phase} />
              <MetaRow label="Level/Zone" value={component.level_zone} />
            </Section>

            <Section title="Geometry">
              <MetaRow label="Volume"   value={fmtNum(component.volume_m3, ' m³')} />
              <MetaRow label="Area"     value={fmtNum(component.area_m2, ' m²')} />
              <MetaRow label="Length"   value={fmtNum(component.length_m, ' m')} />
              <MetaRow label="Material" value={component.material} />
              <MetaRow label="Weight"   value={fmtNum(component.weight_kg, ' kg')} />
            </Section>

            <Section title="Schedule">
              <MetaRow label="Planned Start"  value={fmtDate(component.planned_start)} />
              <MetaRow label="Planned Finish" value={fmtDate(component.planned_finish)} />
              <MetaRow label="Actual Start"   value={fmtDate(component.actual_start)} />
              <MetaRow label="Actual Finish"  value={fmtDate(component.actual_finish)} />
              <MetaRow label="Status"         value={component.status} />
            </Section>

            <Section title="Execution">
              <MetaRow label="Contractor"       value={component.responsible_contractor} />
              <MetaRow label="Work Package"     value={component.work_package_id} />
              <MetaRow label="MEP Density"      value={fmtNum(component.mep_density_score)} />
            </Section>
          </>
        )}
      </div>
    </div>
  );
}
