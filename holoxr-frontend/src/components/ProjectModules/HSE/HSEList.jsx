import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, Clock, BarChart2,
  Upload, Plus, Trash2, Filter,
  Download, ChevronUp, ChevronDown, Pencil,
  TrendingUp, TrendingDown,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, AreaChart, Area, Legend,
  ReferenceLine, Cell,
} from 'recharts';
import { hseApi } from '../../../services/api';
import { useRole } from '../../hooks/useRole';
import EmptyState from '../../ui/EmptyState';
import LoadingSpinner from '../../ui/LoadingSpinner';
import HSEForm from './HSEForm';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  'Open':    { label: 'Open',    color: '#EF4444', bg: '#FEF2F2', border: '#FECACA' },
  'Overdue': { label: 'Overdue', color: '#F97316', bg: '#FFF7ED', border: '#FED7AA' },
  'Closed':  { label: 'Closed',  color: '#059669', bg: '#F0FDF4', border: '#BBF7D0' },
};

// Incident categories for the KPI-style operational table
const INCIDENT_CATS = [
  'PPE Violation', 'Work at Height', 'Electrical', 'Lifting',
  'Housekeeping', 'Near Miss', 'First Aid', 'Other',
];

const SEV_COLOR = { Critical: '#EF4444', Warning: '#F97316', Info: '#EAB308' };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysOpen(d)    { return !d ? 0 : Math.floor((Date.now() - new Date(d)) / 86400000); }
function isToday(d)     { const n = new Date(d), t = new Date(); return n.getFullYear() === t.getFullYear() && n.getMonth() === t.getMonth() && n.getDate() === t.getDate(); }
function isThisWeek(d)  { return daysOpen(d) <= 7; }
function isActive(item) { return item.status !== 'Closed'; }

// Returns one of: 'Open' | 'Overdue' | 'Closed'
function getStatus(item) {
  if (item.status === 'Closed') return 'Closed';
  if (daysOpen(item.date) > 14) return 'Overdue';
  return 'Open';
}

function inTimeframe(item, tf) {
  const days = tf === '1w' ? 7 : 90;
  return daysOpen(item.date) <= days;
}

function sameMonth(date, y, m) {
  const d = new Date(date);
  return d.getFullYear() === y && d.getMonth() === m;
}

function pctDiff(cur, prev) {
  if (!prev && !cur) return null;
  if (!prev) return null;
  return Math.round(((cur - prev) / prev) * 100);
}

// Map an incident to a category bucket
function incidentCategory(item) {
  const t = (item.incidentType || '').toLowerCase();
  const c = (item.complianceCategory || '').toLowerCase();
  if (c.includes('ppe') || t.includes('ppe'))         return 'PPE Violation';
  if (c.includes('height') || t.includes('height'))  return 'Work at Height';
  if (c.includes('electrical') || t.includes('electrical')) return 'Electrical';
  if (c.includes('lifting') || t.includes('lifting')) return 'Lifting';
  if (c.includes('housekeeping'))                     return 'Housekeeping';
  if (t.includes('near miss'))                        return 'Near Miss';
  if (t.includes('first aid'))                        return 'First Aid';
  return 'Other';
}

// ─── Custom Chart Tooltips ────────────────────────────────────────────────────

const ZoneTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value || 0), 0);
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-xs min-w-[140px]">
      <p className="font-semibold text-[#111827] mb-1.5">{label}</p>
      {[...payload].reverse().map(p => p.value > 0 && (
        <div key={p.name} className="flex items-center justify-between gap-3 mb-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.fill }} />
            <span className="text-[#6B7280]">{p.name}</span>
          </div>
          <span className="font-bold text-[#111827]">{p.value}</span>
        </div>
      ))}
      <div className="border-t border-gray-100 mt-1 pt-1 flex justify-between">
        <span className="text-[#9CA3AF]">Total</span>
        <span className="font-black text-[#111827]">{total}</span>
      </div>
    </div>
  );
};

const TrendTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-xs min-w-[150px]">
      <p className="font-semibold text-[#111827] mb-1.5">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center justify-between gap-3 mb-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-[#6B7280]">{p.name}</span>
          </div>
          <span className="font-bold text-[#111827]">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Shared: Timeframe Toggle ─────────────────────────────────────────────────

function TimeframeToggle({ value, onChange }) {
  return (
    <div className="flex items-center gap-px border border-gray-200 rounded-lg overflow-hidden">
      {[{ key: '1w', label: 'Last 1 Week' }, { key: '3m', label: 'Last 3 Months' }].map(o => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={`px-3 py-1.5 text-[11px] font-semibold transition-colors whitespace-nowrap ${
            value === o.key ? 'bg-[#3BB2A5] text-white' : 'bg-white text-[#9CA3AF] hover:bg-gray-50'
          }`}
        >{o.label}</button>
      ))}
    </div>
  );
}

// ─── Shared: StatusTag ────────────────────────────────────────────────────────

function StatusTag({ item }) {
  const cfg = STATUS_CFG[getStatus(item)];
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border whitespace-nowrap"
      style={{ color: cfg.color, backgroundColor: cfg.bg, borderColor: cfg.border }}>
      {cfg.label}
    </span>
  );
}

// ─── Row 1: KPI Cards ─────────────────────────────────────────────────────────

function KPIRow({ active, allItems }) {
  const now   = new Date();
  const y     = now.getFullYear(), m = now.getMonth();
  const lm    = m === 0 ? 11 : m - 1, ly = m === 0 ? y - 1 : y;

  const total        = allItems.length;
  const openCount    = active.filter(i => getStatus(i) === 'Open').length;
  const overdueCount = active.filter(i => getStatus(i) === 'Overdue').length;
  const closedCount  = allItems.filter(i => i.status === 'Closed').length;
  const newWeek      = allItems.filter(i => isThisWeek(i.date)).length;
  const lastMonth    = allItems.filter(i => sameMonth(i.date, ly, lm)).length;
  const thisMonth    = allItems.filter(i => sameMonth(i.date, y, m)).length;
  const moPct        = pctDiff(thisMonth, lastMonth);

  const cards = [
    {
      label: 'Total Incidents',
      value: total,
      color: '#3BB2A5',
      sub: `${thisMonth} this month`,
    },
    {
      label: 'Open',
      value: openCount,
      color: STATUS_CFG.Open.color,
      sub: 'Awaiting action',
      alert: openCount > 0,
    },
    {
      label: 'Overdue',
      value: overdueCount,
      color: STATUS_CFG.Overdue.color,
      sub: 'Past 14-day threshold',
      alert: overdueCount > 0,
    },
    {
      label: 'Closed',
      value: closedCount,
      color: STATUS_CFG.Closed.color,
      sub: 'Resolved incidents',
    },
    {
      label: 'New This Week',
      value: newWeek,
      color: '#2563EB',
      sub: 'Last 7 days',
    },
    {
      label: 'Last Month',
      value: lastMonth,
      color: '#6B7280',
      sub: moPct !== null
        ? (moPct > 0 ? `▲ ${moPct}% vs this month` : moPct < 0 ? `▼ ${Math.abs(moPct)}% vs this month` : 'No change')
        : `${thisMonth} this month`,
      subColor: moPct !== null ? (moPct > 0 ? '#DC2626' : moPct < 0 ? '#059669' : '#9CA3AF') : '#9CA3AF',
    },
  ];

  return (
    <div className="grid grid-cols-6 gap-3">
      {cards.map(c => (
        <div key={c.label}
          className={`rounded-xl border p-4 ${c.alert ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'}`}
        >
          <p className="text-[11px] font-medium text-[#9CA3AF] mb-2 leading-tight">{c.label}</p>
          <p className="text-[28px] font-black leading-none mb-2" style={{ color: c.color }}>{c.value}</p>
          <p className="text-[10px] font-medium leading-tight" style={{ color: c.subColor || '#9CA3AF' }}>{c.sub}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Row 2: Charts with shared timeframe ─────────────────────────────────────

function ChartsRow({ allItems }) {
  const [tf, setTf] = useState('3m'); // shared timeframe for both charts

  const tfItems = useMemo(() => allItems.filter(i => inTimeframe(i, tf)), [allItems, tf]);
  const active  = useMemo(() => tfItems.filter(isActive), [tfItems]);

  // Chart 1: stacked bar by zone & severity, active only
  const zoneData = useMemo(() => {
    const map = {};
    active.forEach(i => {
      const z = i.zoneId || 'Unassigned';
      if (!map[z]) map[z] = { zone: z, Critical: 0, Warning: 0, Info: 0 };
      map[z][i.severity] = (map[z][i.severity] || 0) + 1;
    });
    return Object.values(map)
      .map(r => ({ ...r, _t: r.Critical + r.Warning + r.Info }))
      .sort((a, b) => b._t - a._t);
  }, [active]);

  // Chart 2: workflow area chart — bucket by week within the timeframe
  const trendData = useMemo(() => {
    const buckets = tf === '1w' ? 7 : 12; // days for 1w, weeks for 3m
    const unit    = tf === '1w' ? 1 : 7;

    return Array.from({ length: tf === '1w' ? 7 : 12 }, (_, i) => {
      const ago = (tf === '1w' ? 7 : 84) - i * unit;
      const start = new Date(); start.setDate(start.getDate() - ago - unit + 1);
      const end   = new Date(); end.setDate(end.getDate() - ago);
      const label = tf === '1w'
        ? end.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })
        : `W${String(end.getDate()).padStart(2,'0')}/${String(end.getMonth()+1).padStart(2,'0')}`;

      const inRange = allItems.filter(i => { const d = new Date(i.date); return d >= start && d <= end; });
      return {
        label,
        'Open':    inRange.filter(i => getStatus(i) === 'Open').length,
        'Overdue': inRange.filter(i => getStatus(i) === 'Overdue').length,
        'Closed':  inRange.filter(i => i.status === 'Closed').length,
      };
    });
  }, [allItems, tf]);

  const axisStyle = { fontSize: 10, fill: '#9CA3AF' };
  const tfLabel   = tf === '1w' ? 'Last 1 Week' : 'Last 3 Months';

  return (
    <div className="grid grid-cols-2 gap-4">

      {/* Chart 1 */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[#111827]">Active Incidents by Zone & Severity</p>
          <TimeframeToggle value={tf} onChange={setTf} />
        </div>
        <div className="p-5" style={{ height: 240 }}>
          {zoneData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[#9CA3AF] text-sm">No active incidents in {tfLabel}</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={zoneData} margin={{ top: 4, right: 8, left: -14, bottom: 4 }} barSize={22}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="zone" tick={axisStyle} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={axisStyle} axisLine={false} tickLine={false} />
                <Tooltip content={<ZoneTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', paddingTop: '4px' }}
                  formatter={v => <span style={{ color: '#6B7280' }}>{v}</span>} />
                <Bar dataKey="Critical" stackId="s" fill="#EF4444" name="Critical" />
                <Bar dataKey="Warning"  stackId="s" fill="#F59E0B" name="Warning" />
                <Bar dataKey="Info"     stackId="s" fill="#3BB2A5" name="Info" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Chart 2 */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-[#111827]">Active Workflow Trend</p>
          <TimeframeToggle value={tf} onChange={setTf} />
        </div>
        <div className="p-5" style={{ height: 240 }}>
          {allItems.length === 0 ? (
            <div className="flex items-center justify-center h-full text-[#9CA3AF] text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 4, right: 8, left: -14, bottom: 4 }}>
                <defs>
                  <linearGradient id="gO" x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor="#EF4444" stopOpacity={0.12}/><stop offset="95%" stopColor="#EF4444" stopOpacity={0}/></linearGradient>
                  <linearGradient id="gD" x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor="#F97316" stopOpacity={0.12}/><stop offset="95%" stopColor="#F97316" stopOpacity={0}/></linearGradient>
                  <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor="#059669" stopOpacity={0.12}/><stop offset="95%" stopColor="#059669" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} tick={axisStyle} axisLine={false} tickLine={false} />
                <Tooltip content={<TrendTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', paddingTop: '4px' }}
                  formatter={v => <span style={{ color: '#6B7280' }}>{v}</span>} />
                <Area type="monotone" dataKey="Open"    stroke="#EF4444" strokeWidth={2} fill="url(#gO)" dot={{ r: 2, fill: '#EF4444' }} />
                <Area type="monotone" dataKey="Overdue" stroke="#F97316" strokeWidth={2} fill="url(#gD)" dot={{ r: 2, fill: '#F97316' }} />
                <Area type="monotone" dataKey="Closed"  stroke="#059669" strokeWidth={2} fill="url(#gC)" dot={{ r: 2, fill: '#059669' }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

    </div>
  );
}

// ─── Analytics Row: MTTR + Top Risk ──────────────────────────────────────────

const SLA_DAYS = 7; // configurable SLA target

function IncidentResolutionChart({ allItems }) {
  const [viewBy, setViewBy] = useState('category'); // category | zone | severity

  // Only resolved (closed) incidents have a measurable resolution time
  const resolved = useMemo(() => allItems.filter(i => i.status === 'Closed'), [allItems]);

  const { y, m, lm, ly } = useMemo(() => {
    const n = new Date();
    const _y = n.getFullYear(), _m = n.getMonth();
    return { y: _y, m: _m, lm: _m === 0 ? 11 : _m - 1, ly: _m === 0 ? _y - 1 : _y };
  }, []);

  const data = useMemo(() => {
    const now = new Date();
    // Helper: days between incident date and closedAt (or now as fallback)
    function resolutionDays(item) {
      const start = new Date(item.date);
      const end   = item.closedAt ? new Date(item.closedAt) : now;
      return Math.max(0, Math.floor((end - start) / 86400000));
    }

    function buildRows(keyFn, labelFn) {
      const map = {};
      resolved.forEach(i => {
        const k = keyFn(i);
        if (!map[k]) map[k] = { label: labelFn(i), total: 0, sumDays: 0, exceedSla: 0, thisMonth: 0, lastMonth: 0 };
        const d = resolutionDays(i);
        map[k].total++;
        map[k].sumDays += d;
        if (d > SLA_DAYS) map[k].exceedSla++;
        if (sameMonth(i.date, y, m))  map[k].thisMonth++;
        if (sameMonth(i.date, ly, lm)) map[k].lastMonth++;
      });
      return Object.values(map)
        .map(r => ({
          ...r,
          avg: r.total > 0 ? Math.round((r.sumDays / r.total) * 10) / 10 : 0,
          median: 0, // simplified — median would need per-item list
          slaBreachPct: r.total > 0 ? Math.round((r.exceedSla / r.total) * 100) : 0,
          trendPct: pctDiff(r.thisMonth, r.lastMonth),
        }))
        .sort((a, b) => b.avg - a.avg)
        .slice(0, 8);
    }

    if (viewBy === 'zone')     return buildRows(i => i.zoneId || 'Unassigned', i => i.zoneId || 'Unassigned');
    if (viewBy === 'severity') return buildRows(i => i.severity || 'Info', i => i.severity || 'Info');
    return buildRows(i => incidentCategory(i), i => incidentCategory(i));
  }, [resolved, viewBy, y, m, ly, lm]);

  const avgAll = data.length ? Math.round((data.reduce((s, r) => s + r.avg, 0) / data.length) * 10) / 10 : 0;

  const MttrTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const r = payload[0]?.payload;
    if (!r) return null;
    return (
      <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-xs min-w-[180px]">
        <p className="font-semibold text-[#111827] mb-2">{label}</p>
        <div className="space-y-1">
          <div className="flex justify-between gap-4">
            <span className="text-[#9CA3AF]">Total resolved</span>
            <span className="font-bold text-[#111827]">{r.total}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[#9CA3AF]">Avg resolution</span>
            <span className={`font-bold ${r.avg > SLA_DAYS ? 'text-[#F97316]' : 'text-[#059669]'}`}>{r.avg}d</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[#9CA3AF]">Exceeding SLA</span>
            <span className={`font-bold ${r.slaBreachPct > 0 ? 'text-[#DC2626]' : 'text-[#059669]'}`}>{r.slaBreachPct}%</span>
          </div>
          {r.trendPct !== null && (
            <div className="flex justify-between gap-4 pt-1 border-t border-gray-100">
              <span className="text-[#9CA3AF]">vs last month</span>
              <span className={`font-bold ${r.trendPct > 0 ? 'text-[#DC2626]' : r.trendPct < 0 ? 'text-[#059669]' : 'text-[#9CA3AF]'}`}>
                {r.trendPct > 0 ? '+' : ''}{r.trendPct}%
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const VIEWS = [{ key: 'category', label: 'Category' }, { key: 'zone', label: 'Zone' }, { key: 'severity', label: 'Severity' }];

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-[#111827]">Incident Resolution Performance</p>
          <p className="text-[11px] text-[#9CA3AF] mt-0.5">
            Avg resolution time by {viewBy} · SLA target: {SLA_DAYS}d
            {avgAll > 0 && <span className={`ml-2 font-bold ${avgAll > SLA_DAYS ? 'text-[#F97316]' : 'text-[#059669]'}`}>Overall avg: {avgAll}d</span>}
          </p>
        </div>
        <div className="flex items-center gap-px border border-gray-200 rounded-lg overflow-hidden">
          {VIEWS.map(v => (
            <button key={v.key} onClick={() => setViewBy(v.key)}
              className={`px-3 py-1.5 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                viewBy === v.key ? 'bg-[#3BB2A5] text-white' : 'bg-white text-[#9CA3AF] hover:bg-gray-50'
              }`}>{v.label}</button>
          ))}
        </div>
      </div>

      <div className="px-5 py-4" style={{ height: 260 }}>
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[#9CA3AF] text-sm">
            No resolved incidents yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 60, left: 80, bottom: 4 }} barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false}
                label={{ value: 'days', position: 'insideRight', offset: 10, fontSize: 9, fill: '#9CA3AF' }} />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 10, fill: '#374151' }} axisLine={false} tickLine={false} width={76} />
              <Tooltip content={<MttrTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
              <ReferenceLine x={SLA_DAYS} stroke="#9CA3AF" strokeDasharray="4 3" strokeWidth={1.5}
                label={{ value: `SLA ${SLA_DAYS}d`, position: 'top', fontSize: 9, fill: '#9CA3AF' }} />
              <Bar dataKey="avg" name="Avg days" radius={[0, 3, 3, 0]}>
                {data.map((r, idx) => (
                  <Cell key={idx} fill={r.avg > SLA_DAYS ? '#F97316' : '#3BB2A5'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function TopRiskChart({ allItems }) {
  const [viewBy, setViewBy] = useState('zones'); // zones | categories | overdue

  const data = useMemo(() => {
    function buildZones() {
      const map = {};
      allItems.forEach(i => {
        const z = i.zoneId || 'Unassigned';
        if (!map[z]) map[z] = { label: z, total: 0, overdue: 0 };
        map[z].total++;
        if (i.status !== 'Closed' && daysOpen(i.date) > 14) map[z].overdue++;
      });
      return Object.values(map)
        .map(r => ({ ...r, overduePct: r.total > 0 ? Math.round((r.overdue / r.total) * 100) : 0 }))
        .sort((a, b) => b.total - a.total).slice(0, 5);
    }

    function buildCategories() {
      const map = {};
      allItems.forEach(i => {
        const c = incidentCategory(i);
        if (!map[c]) map[c] = { label: c, total: 0, overdue: 0 };
        map[c].total++;
        if (i.status !== 'Closed' && daysOpen(i.date) > 14) map[c].overdue++;
      });
      return Object.values(map)
        .map(r => ({ ...r, overduePct: r.total > 0 ? Math.round((r.overdue / r.total) * 100) : 0 }))
        .sort((a, b) => b.total - a.total).slice(0, 5);
    }

    function buildOverdue() {
      // Rank by overdue count descending, across both zones and categories combined by zone
      const map = {};
      allItems.forEach(i => {
        const z = i.zoneId || 'Unassigned';
        if (!map[z]) map[z] = { label: z, total: 0, overdue: 0 };
        map[z].total++;
        if (i.status !== 'Closed' && daysOpen(i.date) > 14) map[z].overdue++;
      });
      return Object.values(map)
        .map(r => ({ ...r, overduePct: r.total > 0 ? Math.round((r.overdue / r.total) * 100) : 0 }))
        .filter(r => r.overdue > 0)
        .sort((a, b) => b.overdue - a.overdue).slice(0, 5);
    }

    if (viewBy === 'categories') return buildCategories();
    if (viewBy === 'overdue')    return buildOverdue();
    return buildZones();
  }, [allItems, viewBy]);

  const maxVal = data.length > 0 ? Math.max(...data.map(r => r.total)) : 1;

  const RiskTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const r = payload[0]?.payload;
    if (!r) return null;
    return (
      <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-xs min-w-[170px]">
        <p className="font-semibold text-[#111827] mb-2">{label}</p>
        <div className="space-y-1">
          <div className="flex justify-between gap-4">
            <span className="text-[#9CA3AF]">Total incidents</span>
            <span className="font-bold text-[#111827]">{r.total}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[#9CA3AF]">Overdue</span>
            <span className={`font-bold ${r.overdue > 0 ? 'text-[#F97316]' : 'text-[#9CA3AF]'}`}>{r.overdue}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[#9CA3AF]">Overdue rate</span>
            <span className={`font-bold ${r.overduePct > 30 ? 'text-[#DC2626]' : r.overduePct > 0 ? 'text-[#F97316]' : 'text-[#059669]'}`}>{r.overduePct}%</span>
          </div>
        </div>
      </div>
    );
  };

  const VIEWS = [
    { key: 'zones',      label: 'Top Zones'      },
    { key: 'categories', label: 'Top Categories' },
    { key: 'overdue',    label: 'Top Overdue'    },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-[#111827]">Top Risk Areas</p>
          <p className="text-[11px] text-[#9CA3AF] mt-0.5">Top 5 · sorted by {viewBy === 'overdue' ? 'overdue count' : 'total incidents'}</p>
        </div>
        <div className="flex items-center gap-px border border-gray-200 rounded-lg overflow-hidden">
          {VIEWS.map(v => (
            <button key={v.key} onClick={() => setViewBy(v.key)}
              className={`px-3 py-1.5 text-[11px] font-semibold transition-colors whitespace-nowrap ${
                viewBy === v.key ? 'bg-[#3BB2A5] text-white' : 'bg-white text-[#9CA3AF] hover:bg-gray-50'
              }`}>{v.label}</button>
          ))}
        </div>
      </div>

      <div className="px-5 py-4" style={{ height: 260 }}>
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[#9CA3AF] text-sm">
            {viewBy === 'overdue' ? 'No overdue incidents' : 'No data available'}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 60, left: 90, bottom: 4 }} barSize={16}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 10, fill: '#374151' }} axisLine={false} tickLine={false} width={86} />
              <Tooltip content={<RiskTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
              <Bar dataKey={viewBy === 'overdue' ? 'overdue' : 'total'} name={viewBy === 'overdue' ? 'Overdue' : 'Incidents'} radius={[0, 3, 3, 0]}>
                {data.map((r, idx) => {
                  const isHigh = r.overduePct > 30 || (viewBy === 'overdue' && r.overdue > 0);
                  return <Cell key={idx} fill={isHigh ? '#EF4444' : '#3BB2A5'} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Overdue % mini indicators below chart */}
      {data.some(r => r.overdue > 0) && (
        <div className="px-5 pb-4 flex items-center gap-2 flex-wrap">
          {data.filter(r => r.overdue > 0).map(r => (
            <span key={r.label} className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{
                color: r.overduePct > 30 ? '#DC2626' : '#F97316',
                backgroundColor: r.overduePct > 30 ? '#FEF2F2' : '#FFF7ED',
              }}>
              {r.label}: {r.overduePct}% overdue
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Row 3: KPI-style Operational Table ──────────────────────────────────────

function OperationalTable({ active, allItems, canEdit, onEdit }) {
  const [sortKey,    setSortKey]    = useState('overdue');  // overdue | daysOpen | vsLastMonth
  const [sortDir,    setSortDir]    = useState('desc');
  const [expandedId, setExpandedId] = useState(null);

  const now = new Date(), y = now.getFullYear(), m = now.getMonth();
  const lm  = m === 0 ? 11 : m - 1, ly = m === 0 ? y - 1 : y;

  // Build rows per category from active incidents
  const rows = useMemo(() => {
    return INCIDENT_CATS.map(cat => {
      const catItems  = active.filter(i => incidentCategory(i) === cat);
      const closed    = allItems.filter(i => incidentCategory(i) === cat && i.status === 'Closed').length;
      const open      = catItems.length;
      const overdue   = catItems.filter(i => daysOpen(i.date) > 14).length;
      const resolved  = allItems.filter(i => incidentCategory(i) === cat).length > 0
        ? Math.round((closed / allItems.filter(i => incidentCategory(i) === cat).length) * 100)
        : 0;
      const thisMo    = allItems.filter(i => incidentCategory(i) === cat && sameMonth(i.date, y, m)).length;
      const lastMo    = allItems.filter(i => incidentCategory(i) === cat && sameMonth(i.date, ly, lm)).length;
      const vsLast    = pctDiff(thisMo, lastMo);
      // dominant severity in active items
      const hasCrit   = catItems.some(i => i.severity === 'Critical');
      const hasWarn   = catItems.some(i => i.severity === 'Warning');
      const sevLevel  = hasCrit ? 'Critical' : hasWarn ? 'Warning' : open > 0 ? 'Info' : null;
      // oldest days open in category
      const maxDays   = catItems.length ? Math.max(...catItems.map(i => daysOpen(i.date))) : 0;
      return { cat, open, closed, overdue, resolved, thisMo, lastMo, vsLast, sevLevel, maxDays, items: catItems };
    });
  }, [active, allItems, y, m, ly, lm]);

  const sorted = useMemo(() => {
    const dir = sortDir === 'desc' ? -1 : 1;
    return [...rows].sort((a, b) => {
      if (sortKey === 'overdue')     return (b.overdue   - a.overdue)   * dir;
      if (sortKey === 'daysOpen')    return (b.maxDays   - a.maxDays)   * dir;
      if (sortKey === 'vsLastMonth') return ((b.vsLast ?? -999) - (a.vsLast ?? -999)) * dir;
      return 0;
    });
  }, [rows, sortKey, sortDir]);

  function handleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  function SortIcon({ col }) {
    if (sortKey !== col) return <ChevronDown className="w-3 h-3 opacity-30" />;
    return sortDir === 'desc' ? <ChevronDown className="w-3 h-3 text-[#3BB2A5]" /> : <ChevronUp className="w-3 h-3 text-[#3BB2A5]" />;
  }

  const thBase = 'text-left px-4 py-2.5 text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wide whitespace-nowrap';
  const thSort = `${thBase} cursor-pointer hover:text-[#374151] select-none`;

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <p className="text-sm font-semibold text-[#111827]">Active Incidents Requiring Action</p>
          <p className="text-[11px] text-[#9CA3AF] mt-0.5">Grouped by category · click row to expand incidents · sort by column header</p>
        </div>

        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className={thBase}>Category</th>
              <th className={thBase}>Open</th>
              <th className={thBase}>Closed</th>
              <th className={`${thSort}`} onClick={() => handleSort('overdue')}>
                <span className="flex items-center gap-1">Overdue <SortIcon col="overdue" /></span>
              </th>
              <th className={thBase}>Resolved</th>
              <th className={`${thSort}`} onClick={() => handleSort('vsLastMonth')}>
                <span className="flex items-center gap-1">vs Last Month <SortIcon col="vsLastMonth" /></span>
              </th>
              <th className={`${thSort}`} onClick={() => handleSort('daysOpen')}>
                <span className="flex items-center gap-1">Oldest <SortIcon col="daysOpen" /></span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sorted.map(r => {
              const isExpanded = expandedId === r.cat;
              const sevCol = r.sevLevel ? SEV_COLOR[r.sevLevel] : null;

              return (
                <>
                  <tr
                    key={r.cat}
                    onClick={() => {
                      if (r.items.length === 0) return;
                      setExpandedId(isExpanded ? null : r.cat);
                    }}
                    className={`transition-colors ${r.open > 0 ? 'cursor-pointer hover:bg-gray-50/80' : 'opacity-50'} ${
                      r.overdue > 0 ? 'bg-amber-50/20' : ''
                    } ${isExpanded ? 'bg-gray-50' : ''}`}
                  >
                    {/* Category + severity indicator */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {sevCol ? (
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: sevCol }} />
                        ) : (
                          <span className="w-2 h-2 rounded-full shrink-0 bg-gray-200" />
                        )}
                        <span className="text-[11px] font-semibold text-[#374151]">{r.cat}</span>
                        {r.items.length > 0 && (
                          <span className="text-[9px] text-[#9CA3AF]">({r.items.length})</span>
                        )}
                      </div>
                    </td>
                    {/* Open */}
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-bold ${r.open > 0 ? 'text-[#DC2626]' : 'text-[#9CA3AF]'}`}>
                        {r.open || '—'}
                      </span>
                    </td>
                    {/* Closed */}
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-semibold ${r.closed > 0 ? 'text-[#059669]' : 'text-[#9CA3AF]'}`}>
                        {r.closed || '—'}
                      </span>
                    </td>
                    {/* Overdue */}
                    <td className="px-4 py-3">
                      {r.overdue > 0 ? (
                        <span className="text-[11px] font-black text-[#DC2626] bg-red-50 border border-red-100 px-1.5 py-0.5 rounded-md">
                          {r.overdue}!
                        </span>
                      ) : (
                        <span className="text-[#9CA3AF] text-[11px]">—</span>
                      )}
                    </td>
                    {/* Resolved % */}
                    <td className="px-4 py-3">
                      {r.open + r.closed > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="w-14 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-[#3BB2A5]" style={{ width: `${r.resolved}%` }} />
                          </div>
                          <span className="text-[10px] font-semibold text-[#374151]">{r.resolved}%</span>
                        </div>
                      ) : <span className="text-[#9CA3AF] text-[11px]">—</span>}
                    </td>
                    {/* vs Last Month */}
                    <td className="px-4 py-3">
                      {r.vsLast !== null ? (
                        <span className={`flex items-center gap-0.5 text-[10px] font-bold ${
                          r.vsLast > 0 ? 'text-[#DC2626]' : r.vsLast < 0 ? 'text-[#059669]' : 'text-[#9CA3AF]'
                        }`}>
                          {r.vsLast > 0 ? <TrendingUp className="w-3 h-3" /> : r.vsLast < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                          {r.vsLast > 0 ? '+' : ''}{r.vsLast}%
                        </span>
                      ) : <span className="text-[#9CA3AF] text-[11px]">—</span>}
                    </td>
                    {/* Oldest */}
                    <td className="px-4 py-3">
                      {r.maxDays > 0 ? (
                        <span className={`text-[11px] font-bold ${r.maxDays > 14 ? 'text-[#DC2626]' : 'text-[#374151]'}`}>
                          {r.maxDays}d
                        </span>
                      ) : <span className="text-[#9CA3AF] text-[11px]">—</span>}
                    </td>
                  </tr>

                  {/* Inline expanded row — full incident detail cards */}
                  {isExpanded && r.items.length > 0 && (
                    <tr key={`${r.cat}-expand`}>
                      <td colSpan={7} className="px-4 pb-4 pt-1 bg-gray-50">
                        <div className="space-y-2.5">
                          {r.items
                            .sort((a, b) => {
                              const sc = { Critical: 0, Warning: 1, Info: 2 };
                              return (sc[a.severity] ?? 3) - (sc[b.severity] ?? 3) || daysOpen(b.date) - daysOpen(a.date);
                            })
                            .map(item => {
                              const days    = daysOpen(item.date);
                              const sevCol2 = SEV_COLOR[item.severity] || '#9CA3AF';
                              const isNew   = isToday(item.date);
                              const st      = STATUS_CFG[getStatus(item)];
                              return (
                                <div
                                  key={item._id}
                                  className="bg-white border border-gray-200 rounded-xl overflow-hidden"
                                >
                                  {/* Card header */}
                                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: sevCol2 }} />
                                      {isNew && <span className="text-[9px] font-black text-white bg-red-500 px-1.5 py-0.5 rounded">[NEW]</span>}
                                      <span className="text-[12px] font-semibold text-[#111827]">{item.title}</span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                                      <StatusTag item={item} />
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                                        style={{ color: sevCol2, backgroundColor: `${sevCol2}12`, borderColor: `${sevCol2}30` }}>
                                        {item.severity}
                                      </span>
                                      {item.incidentType && (
                                        <span className="text-[10px] bg-gray-100 text-[#6B7280] px-2 py-0.5 rounded font-medium">{item.incidentType}</span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Card body */}
                                  <div className="px-4 py-3 space-y-3">
                                    {item.description && (
                                      <div>
                                        <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide font-semibold mb-1">Description</p>
                                        <p className="text-[12px] text-[#374151] leading-relaxed">{item.description}</p>
                                      </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                      <div className="bg-gray-50 rounded-lg p-2.5">
                                        <p className="text-[9px] text-[#9CA3AF] uppercase tracking-wide font-semibold mb-1">Zone</p>
                                        <p className="text-[11px] font-bold text-[#111827]">{item.zoneId || '—'}</p>
                                      </div>
                                      <div className={`rounded-lg p-2.5 ${days > 14 ? 'bg-red-50' : 'bg-gray-50'}`}>
                                        <p className="text-[9px] text-[#9CA3AF] uppercase tracking-wide font-semibold mb-1">Days Open</p>
                                        <p className={`text-[11px] font-bold ${days > 14 ? 'text-red-600' : 'text-[#111827]'}`}>
                                          {days}d{days > 14 && <span className="text-[9px] font-semibold ml-1">overdue</span>}
                                        </p>
                                      </div>
                                      <div className="bg-gray-50 rounded-lg p-2.5">
                                        <p className="text-[9px] text-[#9CA3AF] uppercase tracking-wide font-semibold mb-1">Contractor</p>
                                        <p className="text-[11px] font-bold text-[#111827]">{item.subcontractor || '—'}</p>
                                      </div>
                                      <div className="bg-gray-50 rounded-lg p-2.5">
                                        <p className="text-[9px] text-[#9CA3AF] uppercase tracking-wide font-semibold mb-1">Assigned Person</p>
                                        <p className="text-[11px] font-bold text-[#111827]">{item.supervisor || '—'}</p>
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-3 flex-wrap">
                                      <div className="bg-gray-50 rounded-lg px-3 py-2 flex items-center gap-2">
                                        <p className="text-[9px] text-[#9CA3AF] uppercase tracking-wide font-semibold">Status</p>
                                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: st.color }} />
                                        <p className="text-[11px] font-bold" style={{ color: st.color }}>{st.label}</p>
                                      </div>
                                      {item.date && (
                                        <p className="text-[10px] text-[#9CA3AF]">
                                          Reported: <span className="font-semibold text-[#374151]">
                                            {new Date(item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                          </span>
                                        </p>
                                      )}
                                      {canEdit && (
                                        <button
                                          onClick={e => { e.stopPropagation(); onEdit(item); }}
                                          className="text-[11px] font-semibold text-[#3BB2A5] hover:text-[#2d9e92] px-3 py-1.5 rounded-lg border border-[#3BB2A5]/30 hover:bg-[#F0FDFB] transition-colors"
                                        >
                                          Edit
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

    </>
  );
}

// ─── All Incidents Tab (Kanban) ───────────────────────────────────────────────

const SEV_CFG = {
  Critical: { dot: '#EF4444', bg: 'bg-red-50',   text: 'text-red-700',   strip: '#EF4444' },
  Warning:  { dot: '#F59E0B', bg: 'bg-amber-50', text: 'text-amber-700', strip: '#F59E0B' },
  Info:     { dot: '#3BB2A5', bg: 'bg-teal-50',  text: 'text-teal-700',  strip: '#3BB2A5' },
};

const DATE_RANGES = [
  { key: 'all',    label: 'All Time' },
  { key: 'today',  label: 'Today' },
  { key: '7d',     label: 'Last 7 Days' },
  { key: '30d',    label: 'Last 30 Days' },
];

function inDateRange(item, range) {
  if (range === 'all') return true;
  const d = new Date(item.date);
  const now = new Date();
  if (range === 'today') {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  }
  const cutoff = new Date(now);
  if (range === '7d')  cutoff.setDate(now.getDate() - 7);
  if (range === '30d') cutoff.setDate(now.getDate() - 30);
  return d >= cutoff;
}

function KanbanCard({ item, canEdit, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const days = daysOpen(item.date);
  const sev  = SEV_CFG[item.severity] || SEV_CFG.Info;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.04)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-shadow shrink-0">
      {/* severity strip */}
      <div className="h-[3px] w-full rounded-t-xl" style={{ backgroundColor: sev.strip }} />

      <div className="p-3">
        {/* badges row */}
        <div className="flex items-center gap-1 flex-wrap mb-2">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${sev.bg} ${sev.text}`}>
            {item.severity}
          </span>
          {item.incidentType && (
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-[#6B7280] uppercase tracking-wide">
              {item.incidentType}
            </span>
          )}
          {item.isLTI && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-600 uppercase tracking-wide">LTI</span>
          )}
        </div>

        {/* title */}
        <p className="text-[12px] font-semibold text-[#111827] leading-snug mb-2">{item.title}</p>

        {/* meta */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-[#9CA3AF] flex items-center gap-0.5">
            <Clock className="w-2.5 h-2.5" />
            {days === 0 ? 'Today' : `${days}d ago`}
          </span>
          {item.zoneId && (
            <span className="text-[9px] bg-gray-100 text-[#6B7280] px-1.5 py-0.5 rounded font-medium">
              {item.zoneId}
            </span>
          )}
          {item.subcontractor && (
            <span className="text-[9px] text-[#9CA3AF] truncate max-w-[80px]">{item.subcontractor}</span>
          )}
        </div>

        {/* expand toggle */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="mt-2 w-full flex items-center justify-center gap-1 py-1 rounded-lg text-[10px] text-[#9CA3AF] hover:bg-gray-50 hover:text-[#374151] transition-colors"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
          {expanded ? 'Less' : 'Details'}
        </button>
      </div>

      {/* expanded details */}
      {expanded && (
        <div className="border-t border-gray-100 px-3 py-3 space-y-3">
          {item.description && (
            <p className="text-[11px] text-[#374151] leading-relaxed">{item.description}</p>
          )}

          <div className="grid grid-cols-2 gap-2">
            {[
              ['Supervisor',   item.supervisor],
              ['Zone',         item.zoneId],
              ['Manhours',     item.manhours ? `${item.manhours.toLocaleString()} hrs` : null],
              ['Permit',       item.permitType],
              ['Compliance',   item.complianceCategory],
              ['Date',         item.date ? new Date(item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null],
            ].filter(([, v]) => v).map(([label, val]) => (
              <div key={label} className="bg-gray-50 rounded-lg px-2 py-1.5">
                <p className="text-[8px] text-[#9CA3AF] uppercase tracking-wide font-semibold">{label}</p>
                <p className="text-[10px] font-bold text-[#111827] truncate">{val}</p>
              </div>
            ))}
          </div>

          {item.closedAt && (
            <p className="text-[9px] text-[#9CA3AF]">
              Closed: <span className="font-semibold text-[#374151]">
                {new Date(item.closedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </p>
          )}

          {canEdit && (
            <div className="flex items-center gap-1.5 pt-1 border-t border-gray-100">
              <button
                onClick={() => onEdit(item)}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-semibold text-[#3BB2A5] hover:bg-[#F0FDFB] rounded-lg border border-[#3BB2A5]/20 transition-colors"
              >
                <Pencil className="w-3 h-3" /> Edit
              </button>
              <button
                onClick={() => onDelete(item._id)}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-semibold text-red-500 hover:bg-red-50 rounded-lg border border-red-100 transition-colors"
              >
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const KANBAN_COLS = [
  { key: 'Open',    label: 'Open',    color: '#DC2626', bg: 'bg-red-50',    countBg: 'bg-red-100 text-red-700' },
  { key: 'Overdue', label: 'Overdue', color: '#D97706', bg: 'bg-amber-50',  countBg: 'bg-amber-100 text-amber-700' },
  { key: 'Closed',  label: 'Closed',  color: '#059669', bg: 'bg-green-50',  countBg: 'bg-green-100 text-green-700' },
];

function AllIncidentsTab({ items, canEdit, onEdit, onDelete }) {
  const [dateRange,  setDateRange]  = useState('all');
  const [filterSev,  setFilterSev]  = useState('All');
  const [filterType, setFilterType] = useState('All');

  const incidentTypes = useMemo(() => [...new Set(items.map(i => i.incidentType).filter(Boolean))], [items]);

  const filtered = useMemo(() => {
    let list = items.filter(i => inDateRange(i, dateRange));
    if (filterSev  !== 'All') list = list.filter(i => i.severity === filterSev);
    if (filterType !== 'All') list = list.filter(i => i.incidentType === filterType);
    return [...list].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [items, dateRange, filterSev, filterType]);

  const hasFilter = dateRange !== 'all' || filterSev !== 'All' || filterType !== 'All';

  const byStatus = useMemo(() => ({
    Open:    filtered.filter(i => getStatus(i) === 'Open'),
    Overdue: filtered.filter(i => getStatus(i) === 'Overdue'),
    Closed:  filtered.filter(i => getStatus(i) === 'Closed'),
  }), [filtered]);

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Date range pills */}
        <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl">
          {DATE_RANGES.map(({ key, label }) => (
            <button key={key} onClick={() => setDateRange(key)}
              className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                dateRange === key ? 'bg-white text-[#111827] shadow-sm' : 'text-[#6B7280] hover:text-[#374151]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Right: dropdowns + clear */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1.5 bg-white border border-gray-200 rounded-xl">
            <Filter className="w-3 h-3 text-[#9CA3AF] shrink-0" />
            <select value={filterSev} onChange={e => setFilterSev(e.target.value)}
              className="text-[11px] text-[#374151] font-medium bg-transparent border-none outline-none cursor-pointer">
              <option value="All">All Severity</option>
              {['Critical', 'Warning', 'Info'].map(s => (
                <option key={s} value={s}>{s} ({items.filter(i => i.severity === s).length})</option>
              ))}
            </select>
          </div>

          {incidentTypes.length > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1.5 bg-white border border-gray-200 rounded-xl">
              <select value={filterType} onChange={e => setFilterType(e.target.value)}
                className="text-[11px] text-[#374151] font-medium bg-transparent border-none outline-none cursor-pointer">
                <option value="All">All Types</option>
                {incidentTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}

          {hasFilter && (
            <button onClick={() => { setDateRange('all'); setFilterSev('All'); setFilterType('All'); }}
              className="text-[10px] text-[#3BB2A5] hover:underline px-1">
              Clear
            </button>
          )}

          <span className="text-[11px] text-[#9CA3AF] ml-1">{filtered.length} total</span>
        </div>
      </div>

      {/* Kanban board */}
      {filtered.length === 0
        ? <EmptyState title="No incidents found" description="Try adjusting your filters." />
        : (
          <div className="grid grid-cols-3 gap-4 items-start">
            {KANBAN_COLS.map(col => (
              <div key={col.key} className="flex flex-col">
                {/* Column header */}
                <div className={`flex items-center justify-between px-3 py-2 rounded-xl mb-3 ${col.bg}`}>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
                    <span className="text-[12px] font-bold text-[#111827]">{col.label}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${col.countBg}`}>
                    {byStatus[col.key].length}
                  </span>
                </div>

                {/* Scrollable cards area */}
                <div
                  className="flex flex-col gap-2 overflow-y-auto pb-2"
                  style={{ maxHeight: '60vh', scrollbarWidth: 'thin', scrollbarColor: '#D1D5DB transparent' }}
                >
                  {byStatus[col.key].length === 0
                    ? (
                      <div className="text-center py-8 text-[11px] text-[#9CA3AF] border-2 border-dashed border-gray-100 rounded-xl">
                        No incidents
                      </div>
                    )
                    : byStatus[col.key].map(item => (
                      <KanbanCard
                        key={item._id}
                        item={item}
                        canEdit={canEdit}
                        onEdit={onEdit}
                        onDelete={onDelete}
                      />
                    ))
                  }
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════

export default function HSEList({ projectId }) {
  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editing, setEditing]     = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const { canEdit } = useRole();

  const load = () => {
    setLoading(true);
    hseApi.list(projectId).then(setItems).catch(() => setItems([])).finally(() => setLoading(false));
  };

  useEffect(() => { if (projectId) load(); }, [projectId]);

  const handleSave = async (data) => {
    if (editing) await hseApi.update(projectId, editing._id, data);
    else         await hseApi.create(projectId, data);
    setShowForm(false); setEditing(null); load();
  };
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this incident?')) return;
    await hseApi.remove(projectId, id); load();
  };
  const handleClear = async () => {
    if (!window.confirm('Clear ALL HSE data for this project?')) return;
    try { await hseApi.clear(projectId); setItems([]); } catch (err) { alert(err.message || 'Failed'); }
  };

  const active = useMemo(() => items.filter(isActive), [items]);

  const tabs = [
    { key: 'dashboard', label: 'Dashboard',                       icon: BarChart2 },
    { key: 'incidents', label: `All Incidents (${items.length})`, icon: AlertTriangle },
  ];

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-5">

      {/* PAGE HEADER */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-[#111827]">
            HSE Management
          </h1>
          <p className="text-sm text-[#9CA3AF] mt-0.5">Health, Safety & Environment</p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => {
              const headers = ['Title','Severity','IncidentType','Status','Zone','Subcontractor','Supervisor','Date','Manhours','IsLTI','PermitType','ComplianceCategory','Description'];
              const rows = items.map(i => [
                `"${(i.title||'').replace(/"/g,'""')}"`, i.severity||'', i.incidentType||'',
                i.status||'Open', i.zoneId||'', i.subcontractor||'', i.supervisor||'',
                i.date ? new Date(i.date).toLocaleDateString('en-GB') : '',
                i.manhours||0, i.isLTI?'Yes':'No', i.permitType||'', i.complianceCategory||'',
                `"${(i.description||'').replace(/"/g,'""')}"`,
              ].join(','));
              const a = Object.assign(document.createElement('a'), {
                href: URL.createObjectURL(new Blob([[headers.join(','), ...rows].join('\n')], {type:'text/csv'})),
                download: `hse-${new Date().toISOString().slice(0,10)}.csv`,
              });
              a.click();
            }} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#6B7280] bg-white hover:bg-gray-50 rounded-xl border border-gray-200 transition-colors">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            {items.length > 0 && (
              <button onClick={handleClear}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-xl border border-red-100 transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Clear
              </button>
            )}
            <label className="flex items-center gap-1.5 cursor-pointer px-3 py-2 text-xs font-medium text-[#6B7280] bg-white hover:bg-gray-50 rounded-xl border border-gray-200 transition-colors">
              <Upload className="w-3.5 h-3.5" /> Import CSV
              <input type="file" accept=".csv" className="hidden"
                onChange={async e => {
                  if (!e.target.files?.[0]) return;
                  try {
                    setLoading(true);
                    const res = await hseApi.importCsv(projectId, e.target.files[0]);
                    alert(`Imported ${res.importedCount} incidents.`);
                    load();
                  } catch (err) { alert('Import failed: ' + err.message); setLoading(false); }
                  e.target.value = '';
                }} />
            </label>
            <button onClick={() => { setEditing(null); setShowForm(true); }}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#3BB2A5] hover:bg-[#2d9e92] rounded-xl transition-colors shadow-sm">
              <Plus className="w-3.5 h-3.5" /> Report Incident
            </button>
          </div>
        )}
      </div>

      {/* Inline form */}
      {showForm && (
        <HSEForm initial={editing} onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditing(null); }} />
      )}

      {/* TABS — 2 only */}
      <div className="flex items-center gap-1 border-b border-gray-100">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === key ? 'border-[#3BB2A5] text-[#3BB2A5]' : 'border-transparent text-[#9CA3AF] hover:text-[#111827]'
            }`}>
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* DASHBOARD TAB */}
      {activeTab === 'dashboard' && (
        <div className="space-y-5">
          {items.length === 0 ? (
            <EmptyState title="No HSE data yet" description="Report incidents or import the sample CSV to see the dashboard." />
          ) : (
            <>
              <KPIRow active={active} allItems={items} />
              <ChartsRow allItems={items} />
              <div className="grid grid-cols-2 gap-4">
                <IncidentResolutionChart allItems={items} />
                <TopRiskChart allItems={items} />
              </div>
              <OperationalTable
                active={active}
                allItems={items}
                canEdit={canEdit}
                onEdit={i => { setEditing(i); setShowForm(true); }}
              />
            </>
          )}
        </div>
      )}

      {/* ALL INCIDENTS TAB */}
      {activeTab === 'incidents' && (
        <AllIncidentsTab
          items={items}
          canEdit={canEdit}
          onEdit={i => { setEditing(i); setShowForm(true); }}
          onDelete={handleDelete}
        />
      )}

    </div>
  );
}
