import { useMemo, useState } from 'react';
import { X, ChevronRight } from 'lucide-react';

const SEV_COLOR = { Critical: '#EF4444', Warning: '#F59E0B', Info: '#3BB2A5' };
// Approximate workers per zone — can be extended with real data
const ZONE_WORKERS = {
  'Zone-A': 80, 'Zone-B': 60, 'Zone-C': 45, 'Zone-D': 35,
  'Zone-E': 25, 'Zone-F': 20, 'Unassigned': 50,
};
const DEFAULT_WORKERS = 40;

function daysOpen(d) { return !d ? 0 : Math.floor((Date.now() - new Date(d)) / 86400000); }

function sameMonth(date, y, m) {
  const d = new Date(date);
  return d.getFullYear() === y && d.getMonth() === m;
}

function DrilldownDrawer({ zone, items, onClose }) {
  const zoneItems = items.filter(i => (i.zoneId || 'Unassigned') === zone)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20" />
      <div
        className="relative bg-white rounded-tl-2xl rounded-bl-2xl shadow-2xl w-96 h-full flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="text-sm font-bold text-[#111827]">{zone} — Incident Details</p>
            <p className="text-[11px] text-[#9CA3AF] mt-0.5">{zoneItems.length} total incident{zoneItems.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-[#9CA3AF]">
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* Breakdown chips */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-50 flex-wrap">
          {['Critical', 'Warning', 'Info'].map(s => {
            const c = zoneItems.filter(i => i.severity === s).length;
            if (!c) return null;
            return (
              <span key={s} className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ color: SEV_COLOR[s], backgroundColor: `${SEV_COLOR[s]}18` }}>
                {c} {s}
              </span>
            );
          })}
          <span className="text-[10px] text-[#9CA3AF] ml-auto">
            {zoneItems.filter(i => i.status !== 'Closed').length} open
          </span>
        </div>
        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {zoneItems.length === 0 ? (
            <p className="text-sm text-[#9CA3AF] text-center py-10">No incidents</p>
          ) : zoneItems.map(item => {
            const col = SEV_COLOR[item.severity] || '#9CA3AF';
            return (
              <div key={item._id} className="px-5 py-3">
                <div className="flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ backgroundColor: col }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-[#111827] leading-snug">{item.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {item.incidentType && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border"
                          style={{ color: col, borderColor: `${col}40`, backgroundColor: `${col}10` }}>
                          {item.incidentType}
                        </span>
                      )}
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                        item.status === 'Closed' ? 'bg-emerald-50 text-emerald-700'
                        : daysOpen(item.date) > 14 ? 'bg-orange-50 text-orange-700'
                        : 'bg-red-50 text-red-700'
                      }`}>{item.status === 'Closed' ? 'Closed' : daysOpen(item.date) > 14 ? 'Overdue' : 'Open'}</span>
                      <span className="text-[10px] text-[#9CA3AF]">
                        {new Date(item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                      </span>
                    </div>
                    {item.subcontractor && (
                      <p className="text-[10px] text-[#9CA3AF] mt-0.5">{item.subcontractor}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function HSEZoneChart({ items }) {
  const [drillZone, setDrillZone] = useState(null);

  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const lm = m === 0 ? 11 : m - 1;
  const ly = m === 0 ? y - 1 : y;

  const data = useMemo(() => {
    const map = {};
    (items || []).forEach(i => {
      const zone = i.zoneId || 'Unassigned';
      if (!map[zone]) map[zone] = { total: 0, critical: 0, warning: 0, info: 0, thisMonth: 0, lastMonth: 0 };
      map[zone].total++;
      if (i.severity === 'Critical') map[zone].critical++;
      else if (i.severity === 'Warning') map[zone].warning++;
      else map[zone].info++;
      if (sameMonth(i.date, y, m))  map[zone].thisMonth++;
      if (sameMonth(i.date, ly, lm)) map[zone].lastMonth++;
    });

    return Object.entries(map)
      .map(([zone, d]) => {
        const workers = ZONE_WORKERS[zone] || DEFAULT_WORKERS;
        const rate = ((d.total / workers) * 100).toFixed(1);
        const pctChange = d.lastMonth > 0
          ? Math.round(((d.thisMonth - d.lastMonth) / d.lastMonth) * 100)
          : d.thisMonth > 0 ? 100 : null;
        return { zone, ...d, workers, rate: parseFloat(rate), pctChange };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 7);
  }, [items]);

  if (!data.length) return (
    <div className="flex items-center justify-center h-full text-[#9CA3AF] text-sm">No zone data</div>
  );

  const maxTotal = data[0]?.total || 1;

  return (
    <>
      <div className="space-y-2.5">
        {data.map((d, idx) => {
          const critW = (d.critical / maxTotal) * 100;
          const warnW = (d.warning  / maxTotal) * 100;
          const infoW = (d.info     / maxTotal) * 100;
          const up = d.pctChange !== null && d.pctChange > 0;
          const dn = d.pctChange !== null && d.pctChange < 0;

          return (
            <button
              key={d.zone}
              onClick={() => setDrillZone(d.zone)}
              className="w-full text-left group hover:bg-gray-50 rounded-xl px-3 py-2.5 transition-colors"
            >
              {/* Row top: zone name + count + % change */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-[#374151]">{d.zone}</span>
                  <ChevronRight className="w-3 h-3 text-[#D1D5DB] group-hover:text-[#3BB2A5] transition-colors" />
                </div>
                <div className="flex items-center gap-2.5">
                  {/* % change vs last month */}
                  {d.pctChange !== null ? (
                    <span className={`text-[10px] font-bold ${up ? 'text-[#DC2626]' : dn ? 'text-[#059669]' : 'text-[#9CA3AF]'}`}>
                      {up ? '▲' : dn ? '▼' : '='}{Math.abs(d.pctChange)}% mo
                    </span>
                  ) : (
                    <span className="text-[10px] text-[#D1D5DB]">—</span>
                  )}
                  {/* Rate per 100 workers */}
                  <span className="text-[10px] text-[#9CA3AF]">{d.rate}/100w</span>
                  {/* Total */}
                  <span className="text-sm font-black text-[#111827] w-5 text-right">{d.total}</span>
                </div>
              </div>

              {/* Stacked bar */}
              <div className="flex h-1.5 rounded-full overflow-hidden bg-gray-100 gap-px">
                {d.critical > 0 && <div className="bg-red-400 rounded-l-full" style={{ width: `${critW}%` }} />}
                {d.warning  > 0 && <div className="bg-amber-400"              style={{ width: `${warnW}%` }} />}
                {d.info     > 0 && <div className="bg-teal-400 rounded-r-full" style={{ width: `${infoW}%` }} />}
              </div>

              {/* Sub: severity breakdown */}
              <div className="flex items-center gap-3 mt-1">
                {d.critical > 0 && <span className="text-[9px] font-bold text-red-500">{d.critical} Crit</span>}
                {d.warning  > 0 && <span className="text-[9px] font-bold text-amber-500">{d.warning} Warn</span>}
                {d.info     > 0 && <span className="text-[9px] text-teal-600">{d.info} Info</span>}
                <span className="ml-auto text-[9px] text-[#D1D5DB]">~{d.workers} workers</span>
              </div>
            </button>
          );
        })}
      </div>

      {drillZone && (
        <DrilldownDrawer zone={drillZone} items={items || []} onClose={() => setDrillZone(null)} />
      )}
    </>
  );
}
