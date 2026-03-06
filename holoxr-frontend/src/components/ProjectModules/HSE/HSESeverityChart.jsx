import { useMemo } from 'react';

const SEV = [
  { key: 'Critical', color: '#EF4444', bg: '#FEF2F2', text: '#DC2626' },
  { key: 'Warning',  color: '#F59E0B', bg: '#FFFBEB', text: '#D97706' },
  { key: 'Info',     color: '#3BB2A5', bg: '#F0FDFB', text: '#0F766E' },
];

export default function HSESeverityChart({ items }) {
  const { rows, total, openTotal } = useMemo(() => {
    const map = {};
    SEV.forEach(s => { map[s.key] = { total: 0, open: 0, closed: 0, lti: 0 }; });
    (items || []).forEach(i => {
      const s = map[i.severity];
      if (!s) return;
      s.total++;
      if (i.status === 'Closed') s.closed++; else s.open++;
      if (i.isLTI) s.lti++;
    });
    const total = Object.values(map).reduce((a, v) => a + v.total, 0);
    const openTotal = Object.values(map).reduce((a, v) => a + v.open, 0);
    const rows = SEV.map(s => ({ ...s, ...map[s.key] }));
    return { rows, total, openTotal };
  }, [items]);

  if (!total) return (
    <div className="flex items-center justify-center h-full text-[#9CA3AF] text-sm">No data</div>
  );

  return (
    <div className="h-full flex flex-col justify-between gap-3 py-1">
      {/* Stacked proportion bar */}
      <div className="flex h-2 rounded-full overflow-hidden gap-px">
        {rows.map(r => r.total > 0 && (
          <div key={r.key} style={{ width: `${(r.total / total) * 100}%`, backgroundColor: r.color }} />
        ))}
      </div>

      {/* Per-severity stat rows */}
      <div className="space-y-2 flex-1">
        {rows.map(r => {
          const pct = total > 0 ? Math.round((r.total / total) * 100) : 0;
          const closedPct = r.total > 0 ? Math.round((r.closed / r.total) * 100) : 0;
          return (
            <div key={r.key} className="rounded-xl p-3" style={{ backgroundColor: r.bg }}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                  <span className="text-[11px] font-bold" style={{ color: r.text }}>{r.key}</span>
                </div>
                <span className="text-lg font-black leading-none" style={{ color: r.text }}>{r.total}</span>
              </div>
              <div className="flex items-center justify-between text-[10px]" style={{ color: r.text, opacity: 0.75 }}>
                <span>{pct}% of total</span>
                <span>{r.open} open · {closedPct}% resolved</span>
              </div>
              {r.total > 0 && (
                <div className="mt-1.5 h-1 rounded-full overflow-hidden bg-black/10">
                  <div className="h-full rounded-full bg-current" style={{ width: `${closedPct}%`, backgroundColor: r.color, opacity: 0.6 }} />
                </div>
              )}
              {r.lti > 0 && (
                <p className="text-[9px] font-semibold mt-1" style={{ color: r.text }}>⚠ {r.lti} Lost Time Injur{r.lti > 1 ? 'ies' : 'y'}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer totals */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-2">
        <span className="text-[10px] text-[#9CA3AF]">{total} total incidents</span>
        <span className="text-[10px] font-semibold text-[#DC2626]">{openTotal} still open</span>
      </div>
    </div>
  );
}
