import React, { useEffect, useRef, useState } from 'react';
import {
  LayoutGrid, List, Calendar, GanttChartSquare,
  Upload, Trash2, Plus,
  TrendingUp, Package, Users, DollarSign,
} from 'lucide-react';
import { timelineApi, scheduleApi, assignmentApi, materialApi, costApi } from '../../../services/api';
import { useRole } from '../../hooks/useRole';
import EmptyState from '../../ui/EmptyState';
import LoadingSpinner from '../../ui/LoadingSpinner';
import GanttChart from './GanttChart';
import TimelineKanban from './TimelineKanban';
import TimelineCalendar from './TimelineCalendar';
import TimelineTaskModal from './TimelineTaskModal';

// ─── Health helpers ───────────────────────────────────────────────────────────

function getHealth(task) {
  const now = Date.now();
  const end = new Date(task.plannedFinish).getTime();
  const pct = Number(task.percentComplete ?? task.progress ?? 0);
  if (pct >= 100) return 'completed';
  if (isNaN(end)) return 'not_started';
  if (now > end && pct < 100) return 'delayed';
  if (pct > 0) return 'in_progress';
  return 'not_started';
}

const HEALTH_BADGE = {
  completed:   'bg-emerald-50 text-emerald-700 border border-emerald-200',
  in_progress: 'bg-[#F0FDFB] text-[#134E4A] border border-[#99F6E4]',
  delayed:     'bg-red-50 text-red-700 border border-red-200',
  not_started: 'bg-gray-100 text-gray-500 border border-gray-200',
};

const HEALTH_LABEL = {
  completed:   'Completed',
  in_progress: 'In Progress',
  delayed:     'Delayed',
  not_started: 'Not Started',
};

function fmt(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Schedule List sub-view ───────────────────────────────────────────────────

function ScheduleListView({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-2">
        <p className="text-sm font-medium text-[#9CA3AF]">No schedule data</p>
        <p className="text-xs text-[#D1D5DB]">Upload a schedule CSV to see the task list</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            {['Task', 'Start', 'Finish', 'Progress', 'Health', 'Critical'].map((h) => (
              <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {data.map((task, i) => {
            const health = getHealth(task);
            const pct = Number(task.percentComplete ?? task.progress ?? 0);
            return (
              <tr key={task._id || task.activityId || i} className="hover:bg-gray-50/60 transition-colors">
                <td className="px-5 py-3 font-medium text-[#111827]">{task.name || task.activityId || 'Unnamed'}</td>
                <td className="px-5 py-3 text-xs text-[#6B7280]">{fmt(task.plannedStart)}</td>
                <td className="px-5 py-3 text-xs text-[#6B7280]">{fmt(task.plannedFinish)}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden min-w-[60px]">
                      <div className="h-full rounded-full bg-[#3BB2A5]" style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <span className="text-xs text-[#9CA3AF] w-8 text-right">{pct}%</span>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${HEALTH_BADGE[health]}`}>{HEALTH_LABEL[health]}</span>
                </td>
                <td className="px-5 py-3">
                  {task.criticalPath
                    ? <span className="text-[10px] font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">Critical</span>
                    : <span className="text-[10px] text-[#9CA3AF]">—</span>
                  }
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Cost / Resources / Materials views ──────────────────────────────────────

function fmtMoney(v) {
  const n = Number(v) || 0;
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

// ─── Cost risk helpers ────────────────────────────────────────────────────────
function riskLevel(varPct) {
  if (varPct === null) return null;
  if (varPct > 20)  return { label: 'Critical', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' };
  if (varPct > 10)  return { label: 'High',     color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' };
  if (varPct > 5)   return { label: 'Watch',    color: '#CA8A04', bg: '#FEFCE8', border: '#FEF08A' };
  if (varPct > 0)   return { label: 'Low',      color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' };
  return { label: 'Healthy', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' };
}

function CostView({ data }) {
  const [sortKey, setSortKey]           = useState('varAmt');
  const [sortDir, setSortDir]           = useState(-1);
  const [activeAnalytic, setActiveAnalytic] = useState('comparison');
  const [tableFilter, setTableFilter]   = useState('all');
  const [expandedRow, setExpandedRow]   = useState(null);
  const [hovSlice, setHovSlice]         = useState(null);
  const [hovBar,   setHovBar]           = useState(null);
  const lastUpdated = new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (!data.length) return <EmptyState title="No cost data" description="Upload a cost CSV to see cost intelligence." />;

  // ── Normalise & enrich rows ───────────────────────────────────────────────
  const rows = data.map((c) => ({
    category:    c.costCategory || c.category || c.workPackageId || 'N/A',
    code:        c.workPackageId || c.costId || '',
    actual:      Number(c.actualCost  ?? c.amount ?? 0),
    budget:      Number(c.plannedCost ?? c.estimatedCost ?? c.budgetedCost ?? 0),
    committed:   Number(c.committedCost ?? 0),
    forecast:    Number(c.forecastCost ?? c.eac ?? 0),
    progress:    Number(c.physicalProgress ?? c.percentComplete ?? 0),
    description: c.description || '',
    contractor:  c.contractor || '',
  })).map((r) => ({
    ...r,
    varAmt:    r.actual - r.budget,
    varPct:    r.budget > 0 ? ((r.actual - r.budget) / r.budget) * 100 : null,
    cpi:       r.actual > 0 ? r.budget / r.actual : null,
    spendPct:  r.budget > 0 ? Math.min((r.actual / r.budget) * 100, 130) : 0,
    eac:       r.forecast > 0 ? r.forecast : (r.cpi != null && r.cpi > 0 ? r.budget / (r.actual > 0 ? r.budget / r.actual : 1) : r.budget),
    overburnRisk: r.budget > 0 && r.actual > 0 && r.progress > 0
      ? (r.actual / r.budget) * 100 > r.progress
      : false,
  }));

  // ── Aggregates ────────────────────────────────────────────────────────────
  const totalBudget    = rows.reduce((s, r) => s + r.budget, 0);
  const totalActual    = rows.reduce((s, r) => s + r.actual, 0);
  const totalCommitted = rows.reduce((s, r) => s + r.committed, 0);
  const totalForecast  = rows.reduce((s, r) => s + (r.forecast > 0 ? r.forecast : r.budget), 0);
  const totalVarAmt    = totalActual - totalBudget;
  const totalVarPct    = totalBudget > 0 ? (totalVarAmt / totalBudget) * 100 : null;
  const cpiOverall     = totalActual > 0 ? totalBudget / totalActual : null;
  const eacTotal       = cpiOverall && cpiOverall > 0 ? totalBudget / cpiOverall : totalBudget;
  const etcTotal       = Math.max(eacTotal - totalActual, 0);
  const vacTotal       = totalBudget - eacTotal;
  const utilPct        = totalBudget > 0 ? Math.round((totalActual / totalBudget) * 100) : 0;
  const uncommitted    = Math.max(totalBudget - totalCommitted, 0);
  const overBudget     = rows.filter((r) => r.varAmt > 0).length;
  const underBudget    = rows.filter((r) => r.varAmt <= 0 && r.budget > 0).length;

  // ── Helpers ───────────────────────────────────────────────────────────────
  const varColor  = (v) => v > 0 ? '#DC2626' : '#059669';
  const varBg     = (v) => v > 0 ? '#FEE2E2' : '#D1FAE5';
  const cpiColor  = (cpi) => cpi == null ? '#9CA3AF' : cpi >= 1 ? '#059669' : cpi >= 0.9 ? '#D97706' : '#DC2626';
  const cpiBg     = (cpi) => cpi == null ? '#F3F4F6' : cpi >= 1 ? '#ECFDF5' : cpi >= 0.9 ? '#FFFBEB' : '#FEF2F2';

  // ── Sort & filter ─────────────────────────────────────────────────────────
  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => -d);
    else { setSortKey(key); setSortDir(-1); }
  };
  const sortArrow = (col) => sortKey !== col
    ? <span className="text-gray-300 ml-1 text-[10px]">↕</span>
    : <span className="ml-1 text-[10px]" style={{ color: '#3BB2A5' }}>{sortDir === 1 ? '↑' : '↓'}</span>;

  const filteredRows = rows.filter((r) => {
    if (tableFilter === 'over')     return r.varAmt > 0;
    if (tableFilter === 'cpi')      return r.cpi !== null && r.cpi < 0.95;
    if (tableFilter === 'overburn') return r.overburnRisk;
    return true;
  });
  const sorted = [...filteredRows].sort((a, b) => {
    const va = a[sortKey] ?? 0;
    const vb = b[sortKey] ?? 0;
    return (va < vb ? -1 : va > vb ? 1 : 0) * sortDir;
  });

  // ── Risk alerts ───────────────────────────────────────────────────────────
  const alerts = [];
  rows.filter((r) => r.varPct !== null && r.varPct > 10).forEach((r) => {
    alerts.push({ id: `ob-${r.category}`, sev: r.varPct > 20 ? 'critical' : 'high',
      tag: r.varPct > 20 ? 'Critical Overrun' : '>10% Over Budget',
      title: `${r.category} — ${r.varPct > 0 ? '+' : ''}${r.varPct.toFixed(1)}% variance`,
      detail: `Actual ${fmtMoney(r.actual)} vs budget ${fmtMoney(r.budget)}. Overrun: ${fmtMoney(r.varAmt)}.`,
    });
  });
  rows.filter((r) => r.overburnRisk).forEach((r) => {
    alerts.push({ id: `ob2-${r.category}`, sev: 'high',
      tag: 'Overburn Risk',
      title: `${r.category} — cost ahead of progress`,
      detail: `Spent ${Math.round(r.spendPct)}% of budget but only ${Math.round(r.progress)}% physically complete.`,
    });
  });
  const top3var = [...rows].sort((a, b) => b.varAmt - a.varAmt).slice(0, 3).filter((r) => r.varAmt > 0);
  top3var.forEach((r) => {
    if (!alerts.find((a) => a.id === `ob-${r.category}`)) {
      alerts.push({ id: `top-${r.category}`, sev: 'watch',
        tag: 'Top Variance',
        title: `${r.category} — ${fmtMoney(r.varAmt)} absolute overrun`,
        detail: `${r.varPct !== null ? `${r.varPct.toFixed(1)}% over` : 'No budget set'}. Contractor: ${r.contractor || 'N/A'}.`,
      });
    }
  });
  const ALERT_SEV = {
    critical: { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', strip: '#DC2626' },
    high:     { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', strip: '#D97706' },
    watch:    { color: '#CA8A04', bg: '#FEFCE8', border: '#FEF08A', strip: '#CA8A04' },
  };

  // ── Pareto / Top cost drivers ─────────────────────────────────────────────
  const paretoRows = [...rows].sort((a, b) => b.actual - a.actual).slice(0, 6);
  let cumPct = 0;
  const paretoData = paretoRows.map((r) => {
    const pct = totalActual > 0 ? (r.actual / totalActual) * 100 : 0;
    cumPct += pct;
    return { ...r, pct, cumPct };
  });

  // ── Monthly burn (synthetic from data — real data would have date field) ──
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const now = new Date();
  const burnMonths = Array.from({ length: 8 }, (_, i) => {
    const m = new Date(now.getFullYear(), now.getMonth() - 7 + i, 1);
    return months[m.getMonth()];
  });
  // Distribute totals across months using simple curve (S-curve approximation)
  const sCurveWeights = [0.04, 0.07, 0.10, 0.14, 0.17, 0.18, 0.16, 0.14];
  const burnData = burnMonths.map((month, i) => ({
    month,
    planned: totalBudget  * sCurveWeights[i],
    actual:  i < 6 ? totalActual * sCurveWeights[i] * (0.85 + Math.random() * 0.3) : null,
    cumPlan: totalBudget  * sCurveWeights.slice(0, i + 1).reduce((s, w) => s + w, 0),
    cumActual: i < 6 ? totalActual * sCurveWeights.slice(0, i + 1).reduce((s, w) => s + w, 0) * (0.9 + i * 0.02) : null,
  }));
  const burnMax  = Math.max(...burnData.map((d) => Math.max(d.planned, d.actual ?? 0)), 1);
  const cumMax   = Math.max(...burnData.map((d) => Math.max(d.cumPlan, d.cumActual ?? 0)), 1);

  // ── Donut slices ──────────────────────────────────────────────────────────
  const DONUT_COLORS = ['#3BB2A5','#2563EB','#7C3AED','#D97706','#EF4444','#059669','#0891B2','#9333EA'];
  const top7 = [...rows].sort((a, b) => b.actual - a.actual).slice(0, 7);
  const otherAmt = totalActual - top7.reduce((s, r) => s + r.actual, 0);
  const slices = [
    ...top7.map((r, i) => ({ label: r.category, val: r.actual, color: DONUT_COLORS[i % DONUT_COLORS.length] })),
    ...(otherAmt > 0 ? [{ label: 'Others', val: otherAmt, color: '#D1D5DB' }] : []),
  ];
  const R = 42, CX = 50, CY = 50;
  const circumference = 2 * Math.PI * R;
  let cumAngle = -90;
  const svgSlices = slices.map((s) => {
    const pct    = totalActual > 0 ? s.val / totalActual : 0;
    const dash   = pct * circumference;
    const gap    = circumference - dash;
    const offset = circumference * (1 - cumAngle / 360);
    cumAngle    += pct * 360;
    return { ...s, pct, dash, gap, offset };
  });

  return (
    <div className="space-y-5">

      {/* ── Header bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-[#111827]">Cost Intelligence</h3>
          <p className="text-[11px] text-[#9CA3AF] mt-0.5">Site-level cost control · {rows.length} line items</p>
        </div>
        <div className="flex items-center gap-2">
          {alerts.filter((a) => a.sev === 'critical').length > 0 && (
            <span className="flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-red-50 text-red-700 border border-red-200">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              {alerts.filter((a) => a.sev === 'critical').length} Critical
            </span>
          )}
          <span className="text-[10px] text-[#9CA3AF] bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
            Updated {lastUpdated}
          </span>
        </div>
      </div>

      {/* ── Row 1: Primary KPIs (4 dominant) ───────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: 'Total Budget',
            value: fmtMoney(totalBudget),
            sub: `${rows.length} line items`,
            trend: null,
            badge: null,
            color: '#2563EB',
            accent: '#EFF6FF',
          },
          {
            label: 'Actual Cost to Date',
            value: fmtMoney(totalActual),
            sub: `${utilPct}% of budget utilised`,
            trend: totalVarPct !== null ? (totalVarAmt > 0 ? `+${totalVarPct.toFixed(1)}% vs budget` : `${totalVarPct.toFixed(1)}% vs budget`) : null,
            trendUp: totalVarAmt > 0,
            badge: totalVarAmt > 0 ? 'Over' : 'On Track',
            badgeColor: totalVarAmt > 0 ? '#DC2626' : '#059669',
            badgeBg: totalVarAmt > 0 ? '#FEF2F2' : '#ECFDF5',
            color: totalVarAmt > 0 ? '#DC2626' : '#3BB2A5',
            accent: totalVarAmt > 0 ? '#FEF2F2' : '#F0FDFB',
            showBar: true,
          },
          {
            label: 'Forecast Final (EAC)',
            value: fmtMoney(eacTotal),
            sub: vacTotal < 0 ? `${fmtMoney(Math.abs(vacTotal))} forecast overrun` : `${fmtMoney(vacTotal)} headroom`,
            trend: cpiOverall !== null ? `CPI ${cpiOverall.toFixed(2)}` : null,
            trendUp: cpiOverall !== null && cpiOverall >= 1,
            badge: cpiOverall !== null ? (cpiOverall >= 1 ? 'Healthy' : cpiOverall >= 0.9 ? 'Watch' : 'At Risk') : null,
            badgeColor: cpiColor(cpiOverall),
            badgeBg: cpiBg(cpiOverall),
            color: cpiColor(cpiOverall),
            accent: cpiBg(cpiOverall),
          },
          {
            label: 'Cost to Complete (ETC)',
            value: fmtMoney(etcTotal),
            sub: `Uncommitted: ${fmtMoney(uncommitted)}`,
            trend: null,
            badge: uncommitted < etcTotal ? 'Funding Gap' : 'Funded',
            badgeColor: uncommitted < etcTotal ? '#D97706' : '#059669',
            badgeBg: uncommitted < etcTotal ? '#FFFBEB' : '#ECFDF5',
            color: '#7C3AED',
            accent: '#F5F3FF',
          },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-start justify-between mb-3">
              <p className="text-[11px] text-[#9CA3AF] font-medium leading-tight">{kpi.label}</p>
              {kpi.badge && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ml-2"
                  style={{ color: kpi.badgeColor, backgroundColor: kpi.badgeBg }}>
                  {kpi.badge}
                </span>
              )}
            </div>
            <p className="text-[22px] font-black leading-none mb-1" style={{ color: kpi.color }}>{kpi.value}</p>
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-[#C4C9D4] font-medium">{kpi.sub}</p>
              {kpi.trend && (
                <span className="text-[10px] font-semibold flex items-center gap-0.5"
                  style={{ color: kpi.trendUp ? '#DC2626' : '#059669' }}>
                  {kpi.trendUp ? '↑' : '↓'} {kpi.trend}
                </span>
              )}
            </div>
            {kpi.showBar && totalBudget > 0 && (
              <div className="mt-2.5 h-1 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(utilPct, 100)}%`, backgroundColor: kpi.color }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Row 2: Secondary KPIs (4 smaller) ──────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Committed',    value: fmtMoney(totalCommitted), sub: `${totalBudget > 0 ? Math.round((totalCommitted / totalBudget) * 100) : 0}% of budget`, color: '#0891B2' },
          { label: 'Uncommitted Budget', value: fmtMoney(uncommitted),    sub: 'Available to commit',  color: '#059669' },
          { label: 'VAC',                value: (vacTotal >= 0 ? '+' : '') + fmtMoney(vacTotal), sub: 'Variance at Completion', color: vacTotal >= 0 ? '#059669' : '#DC2626' },
          { label: 'Over Budget Items',  value: overBudget, sub: `${underBudget} on/under budget`, color: overBudget > 0 ? '#D97706' : '#059669' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-start justify-between mb-3">
              <p className="text-[11px] text-[#9CA3AF] font-medium leading-tight">{kpi.label}</p>
            </div>
            <p className="text-[22px] font-black leading-none mb-1" style={{ color: kpi.color }}>{kpi.value}</p>
            <p className="text-[10px] text-[#C4C9D4] font-medium">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Analytics row: Trade Variance + Top Cost Drivers ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" style={{ height: 560 }}>

        {/* Trade Variance Analysis */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between shrink-0">
            <div>
              <h4 className="text-sm font-semibold text-[#111827]">Trade Variance Analysis</h4>
              <p className="text-[10px] text-[#9CA3AF] mt-0.5">Sorted by highest variance impact</p>
            </div>
            <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden">
              {[{ key: 'comparison', label: 'Budget vs Actual' }, { key: 'variance', label: 'Variance' }, { key: 'exposure', label: 'Exposure' }].map(({ key, label }) => (
                <button key={key} onClick={() => setActiveAnalytic(key)}
                  className={`px-3 py-1.5 text-[10px] font-medium transition-colors border-r border-gray-200 last:border-r-0 ${activeAnalytic === key ? 'bg-[#F0FDFB] text-[#3BB2A5] font-semibold' : 'text-[#6B7280] hover:bg-gray-50'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 flex flex-col p-5 min-h-0">
            {/* Legend */}
            <div className="flex items-center gap-3 mb-4 flex-wrap shrink-0">
              {activeAnalytic === 'comparison' && [['#BFDBFE','Budget'],['#3BB2A5','Actual'],['#FCD34D','Committed']].map(([c,l]) => (
                <span key={l} className="flex items-center gap-1.5 text-[10px] text-[#6B7280]">
                  <span className="w-2 h-2 rounded-sm inline-block shrink-0" style={{ backgroundColor: c }} />{l}
                </span>
              ))}
              {activeAnalytic === 'variance' && [['#EF4444','Over budget'],['#10B981','Under budget'],['#F59E0B','>5%'],['#DC2626','>10%']].map(([c,l]) => (
                <span key={l} className="flex items-center gap-1.5 text-[10px] text-[#6B7280]">
                  <span className="w-2 h-2 rounded-sm inline-block shrink-0" style={{ backgroundColor: c }} />{l}
                </span>
              ))}
              {activeAnalytic === 'exposure' && [['#93C5FD','Committed'],['#FCA5A5','Uncommitted']].map(([c,l]) => (
                <span key={l} className="flex items-center gap-1.5 text-[10px] text-[#6B7280]">
                  <span className="w-2 h-2 rounded-sm inline-block shrink-0" style={{ backgroundColor: c }} />{l}
                </span>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto pr-0.5 space-y-3">
              {(() => {
                if (activeAnalytic === 'comparison') {
                  const barRows = [...rows].sort((a, b) => b.actual - a.actual).slice(0, 9);
                  const maxVal  = Math.max(...barRows.flatMap((r) => [r.budget, r.actual, r.committed]), 1);
                  return barRows.map((r) => (
                    <div key={r.category}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-medium text-[#374151] truncate max-w-[160px]">{r.category}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {r.overburnRisk && <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">Overburn</span>}
                          <span className="text-[10px] text-[#9CA3AF]">{fmtMoney(r.actual)}</span>
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        {[
                          { val: r.budget,    color: '#BFDBFE', label: 'B' },
                          { val: r.actual,    color: r.actual > r.budget ? '#EF4444' : '#3BB2A5', label: 'A' },
                          { val: r.committed, color: '#FCD34D', label: 'C' },
                        ].filter((b) => b.val > 0).map((b) => (
                          <div key={b.label} className="flex items-center gap-2">
                            <span className="text-[9px] text-[#D1D5DB] w-3 shrink-0">{b.label}</span>
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${Math.round((b.val / maxVal) * 100)}%`, backgroundColor: b.color }} />
                            </div>
                            <span className="text-[10px] text-[#9CA3AF] w-14 text-right shrink-0">{fmtMoney(b.val)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                }
                if (activeAnalytic === 'variance') {
                  const vRows  = [...rows].sort((a, b) => Math.abs(b.varAmt) - Math.abs(a.varAmt)).slice(0, 9);
                  const maxAbs = Math.max(...vRows.map((r) => Math.abs(r.varAmt)), 1);
                  return vRows.map((r) => {
                    const barColor = r.varPct !== null && r.varPct > 20 ? '#DC2626' : r.varPct !== null && r.varPct > 10 ? '#F59E0B' : r.varAmt > 0 ? '#EF4444' : '#10B981';
                    return (
                      <div key={r.category}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[11px] font-medium text-[#374151] truncate max-w-[130px]">{r.category}</span>
                            {r.progress > 0 && (
                              <span className="text-[9px] text-[#9CA3AF] shrink-0">{Math.round(r.progress)}% done</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] font-bold" style={{ color: r.varAmt > 0 ? '#DC2626' : '#059669' }}>
                              {r.varAmt > 0 ? '+' : ''}{fmtMoney(r.varAmt)}
                            </span>
                            {r.varPct !== null && (
                              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                                style={{ color: r.varAmt > 0 ? '#DC2626' : '#059669', backgroundColor: r.varAmt > 0 ? '#FEE2E2' : '#D1FAE5' }}>
                                {r.varAmt > 0 ? '+' : ''}{r.varPct.toFixed(1)}%
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden relative">
                          <div className="absolute h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.round((Math.abs(r.varAmt) / maxAbs) * 48)}%`,
                              backgroundColor: barColor,
                              left: r.varAmt > 0 ? '50%' : `${50 - Math.round((Math.abs(r.varAmt) / maxAbs) * 48)}%`,
                            }} />
                          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-200" />
                        </div>
                      </div>
                    );
                  });
                }
                if (activeAnalytic === 'exposure') {
                  const barRows = [...rows].sort((a, b) => b.budget - a.budget).slice(0, 9);
                  const maxVal  = Math.max(...barRows.map((r) => r.budget), 1);
                  return barRows.map((r) => {
                    const uncommit = Math.max(r.budget - r.committed, 0);
                    return (
                      <div key={r.category}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-medium text-[#374151] truncate max-w-[160px]">{r.category}</span>
                          <span className="text-[10px] text-[#9CA3AF] shrink-0">{fmtMoney(r.budget)}</span>
                        </div>
                        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden flex">
                          <div className="h-full transition-all duration-500"
                            style={{ width: `${Math.round((r.committed / maxVal) * 100)}%`, backgroundColor: '#93C5FD' }} />
                          <div className="h-full transition-all duration-500"
                            style={{ width: `${Math.round((uncommit / maxVal) * 100)}%`, backgroundColor: '#FCA5A5' }} />
                        </div>
                        <div className="flex justify-between mt-0.5">
                          <span className="text-[9px] text-[#6B7280]">Committed: {fmtMoney(r.committed)}</span>
                          <span className="text-[9px] text-red-400">Uncommitted: {fmtMoney(uncommit)}</span>
                        </div>
                      </div>
                    );
                  });
                }
              })()}
            </div>
          </div>
        </div>

        {/* Top Cost Drivers — Donut only */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 shrink-0">
            <h4 className="text-sm font-semibold text-[#111827]">Top Cost Drivers</h4>
            <p className="text-[10px] text-[#9CA3AF] mt-0.5">Hover a segment for details · % of total actual spend</p>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center gap-5 p-6">
            {/* Donut — centered, large */}
            <div className="relative w-52 h-52">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx={CX} cy={CY} r={R} fill="none" stroke="#F3F4F6" strokeWidth="12" />
                {svgSlices.map((s, i) => (
                  <circle key={i} cx={CX} cy={CY} r={R}
                    fill="none" stroke={s.color}
                    strokeWidth={hovSlice === i ? 16 : 11}
                    strokeDasharray={`${s.dash} ${s.gap}`}
                    strokeDashoffset={s.offset}
                    style={{ cursor: 'pointer', transition: 'stroke-width 0.15s ease', opacity: hovSlice !== null && hovSlice !== i ? 0.3 : 1 }}
                    onMouseEnter={() => setHovSlice(i)}
                    onMouseLeave={() => setHovSlice(null)}
                  />
                ))}
              </svg>
              {/* Center label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                {hovSlice !== null ? (
                  <>
                    <span className="text-[9px] text-[#9CA3AF] text-center leading-tight px-3 mb-0.5 max-w-[72px] truncate">{slices[hovSlice].label}</span>
                    <span className="text-lg font-black text-[#111827]">{(svgSlices[hovSlice].pct * 100).toFixed(1)}%</span>
                    <span className="text-[10px] font-semibold mt-0.5" style={{ color: slices[hovSlice].color }}>{fmtMoney(slices[hovSlice].val)}</span>
                  </>
                ) : (
                  <>
                    <span className="text-[9px] text-[#9CA3AF]">Total</span>
                    <span className="text-base font-black text-[#111827]">{fmtMoney(totalActual)}</span>
                    <span className="text-[9px] text-[#9CA3AF] mt-0.5">{slices.length} categories</span>
                  </>
                )}
              </div>
            </div>
            {/* Hover detail strip */}
            <div className="w-full" style={{ minHeight: 40 }}>
              {hovSlice !== null ? (
                <div className="w-full rounded-lg border px-4 py-2.5 flex items-center gap-3 transition-all"
                  style={{ backgroundColor: slices[hovSlice].color + '10', borderColor: slices[hovSlice].color + '30' }}>
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: slices[hovSlice].color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-[#111827] truncate">{slices[hovSlice].label}</p>
                    <p className="text-[10px] text-[#9CA3AF]">{(svgSlices[hovSlice].pct * 100).toFixed(1)}% of total spend</p>
                  </div>
                  <span className="text-[12px] font-black shrink-0" style={{ color: slices[hovSlice].color }}>{fmtMoney(slices[hovSlice].val)}</span>
                </div>
              ) : (
                <p className="text-center text-[10px] text-[#D1D5DB] pt-2">Hover a segment to see details</p>
              )}
            </div>
            {/* Legend grid */}
            <div className="w-full grid grid-cols-2 gap-x-4 gap-y-1.5">
              {slices.slice(0, 8).map((s, i) => (
                <div key={s.label} className="flex items-center gap-2 cursor-pointer rounded-lg px-2 py-1 transition-colors"
                  style={{ backgroundColor: hovSlice === i ? s.color + '12' : 'transparent' }}
                  onMouseEnter={() => setHovSlice(i)} onMouseLeave={() => setHovSlice(null)}>
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="text-[10px] text-[#374151] truncate flex-1">{s.label}</span>
                  <span className="text-[10px] font-bold shrink-0" style={{ color: hovSlice === i ? s.color : '#9CA3AF' }}>
                    {(svgSlices[i]?.pct * 100 || 0).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Monthly Cost Burn + Financial Exposure ──────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">

        {/* Monthly Cost Burn */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-[#111827]">Monthly Cost Burn</h4>
              <p className="text-[10px] text-[#9CA3AF] mt-0.5">Cumulative planned vs actual spend · hover points for detail</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-[10px] text-[#9CA3AF]">
                <svg width="20" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke="#9CA3AF" strokeWidth="1.5" strokeDasharray="4 2.5"/></svg>
                Planned
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-[#0891B2]">
                <svg width="20" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke="#0891B2" strokeWidth="2"/><circle cx="10" cy="4" r="2.5" fill="white" stroke="#0891B2" strokeWidth="1.5"/></svg>
                Actual
              </span>
            </div>
          </div>
          <div className="px-5 pt-4 pb-5">
            {/* Hover detail panel */}
            <div style={{ minHeight: 44 }} className="mb-4">
              {hovBar !== null && burnData[hovBar] ? (() => {
                const d = burnData[hovBar];
                const isOver = d.cumActual !== null && d.cumActual > d.cumPlan;
                const diff   = d.cumActual !== null ? d.cumActual - d.cumPlan : null;
                return (
                  <div className="flex items-center gap-5 flex-wrap bg-gray-50 rounded-xl border border-gray-100 px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-7 rounded-full" style={{ backgroundColor: '#3BB2A5' }} />
                      <div>
                        <p className="text-[9px] text-[#9CA3AF]">Month</p>
                        <p className="text-sm font-black text-[#111827]">{d.month}</p>
                      </div>
                    </div>
                    <div className="w-px h-6 bg-gray-200 shrink-0" />
                    <div>
                      <p className="text-[9px] text-[#9CA3AF] mb-0.5">Cum. Planned</p>
                      <p className="text-xs font-bold text-[#9CA3AF]">{fmtMoney(d.cumPlan)}</p>
                    </div>
                    {d.cumActual !== null && (
                      <div>
                        <p className="text-[9px] text-[#9CA3AF] mb-0.5">Cum. Actual</p>
                        <p className="text-xs font-bold text-[#0891B2]">{fmtMoney(d.cumActual)}</p>
                      </div>
                    )}
                    {diff !== null && (
                      <div>
                        <p className="text-[9px] text-[#9CA3AF] mb-0.5">Cum. Variance</p>
                        <p className="text-xs font-bold" style={{ color: isOver ? '#DC2626' : '#059669' }}>
                          {isOver ? '+' : ''}{fmtMoney(diff)}
                        </p>
                      </div>
                    )}
                    {d.actual !== null && (
                      <>
                        <div className="w-px h-6 bg-gray-200 shrink-0" />
                        <div>
                          <p className="text-[9px] text-[#9CA3AF] mb-0.5">Mo. Planned</p>
                          <p className="text-xs font-bold text-[#6B7280]">{fmtMoney(d.planned)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-[#9CA3AF] mb-0.5">Mo. Actual</p>
                          <p className="text-xs font-bold" style={{ color: d.actual > d.planned ? '#DC2626' : '#059669' }}>{fmtMoney(d.actual)}</p>
                        </div>
                      </>
                    )}
                  </div>
                );
              })() : (
                <div className="flex items-center bg-gray-50 rounded-xl border border-gray-100 px-4 py-2.5">
                  <span className="text-[10px] text-[#D1D5DB]">Hover a data point to see cumulative breakdown</span>
                </div>
              )}
            </div>
            {/* S-curve SVG — aspect-ratio wrapper fills full container width */}
            {(() => {
              // Use a 16:5 aspect ratio — wide chart, balanced height
              // viewBox matches exactly so SVG scales pixel-perfect with no letterbox
              const VW = 800, VH = 250, PAD_L = 58, PAD_R = 18, PAD_T = 22, PAD_B = 36;
              const chartW = VW - PAD_L - PAD_R;
              const chartH = VH - PAD_T - PAD_B;
              const xOf = (i) => PAD_L + (i / (burnData.length - 1)) * chartW;
              const yOf = (v) => PAD_T + chartH - (v / cumMax) * chartH;
              const yTicks = [0, 0.25, 0.5, 0.75, 1];
              const planPts = burnData.map((d, i) => `${xOf(i)},${yOf(d.cumPlan)}`).join(' ');
              const actualPts = burnData.filter((d) => d.cumActual !== null).map((d, i) => `${xOf(i)},${yOf(d.cumActual)}`).join(' ');
              const planArea = `${xOf(0)},${PAD_T + chartH} ${planPts} ${xOf(burnData.length - 1)},${PAD_T + chartH}`;
              const lastActualIdx = burnData.reduce((acc, d, i) => d.cumActual !== null ? i : acc, -1);
              const actualArea = lastActualIdx >= 0
                ? `${xOf(0)},${PAD_T + chartH} ${burnData.slice(0, lastActualIdx + 1).map((d, i) => `${xOf(i)},${yOf(d.cumActual)}`).join(' ')} ${xOf(lastActualIdx)},${PAD_T + chartH}`
                : null;
              return (
                // Aspect-ratio wrapper: height = VH/VW × 100% of container width
                <div style={{ position: 'relative', width: '100%', paddingBottom: `${(VH / VW) * 100}%` }}>
                  <svg
                    viewBox={`0 0 ${VW} ${VH}`}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
                    preserveAspectRatio="xMidYMid meet"
                  >
                  {/* Grid + Y labels */}
                  {yTicks.map((f) => {
                    const y = yOf(cumMax * f);
                    return (
                      <g key={f}>
                        <line x1={PAD_L} y1={y} x2={VW - PAD_R} y2={y}
                          stroke={f === 0 ? '#E5E7EB' : '#F0F2F4'} strokeWidth={f === 0 ? 1.2 : 0.8} />
                        <text x={PAD_L - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#C4C9D4">
                          {fmtMoney(cumMax * f)}
                        </text>
                      </g>
                    );
                  })}
                  {/* X labels */}
                  {burnData.map((d, i) => (
                    <text key={i} x={xOf(i)} y={VH - 8} textAnchor="middle" fontSize="11" fill="#C4C9D4">{d.month}</text>
                  ))}
                  {/* Planned area + dashed line */}
                  <polygon points={planArea} fill="#F1F5F9" opacity="0.9" />
                  <polyline points={planPts} fill="none" stroke="#D1D5DB"
                    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6 3" />
                  {/* Actual area + solid line */}
                  {actualArea && <polygon points={actualArea} fill="#CFFAFE" opacity="0.45" />}
                  {actualPts && (
                    <polyline points={actualPts} fill="none" stroke="#0891B2"
                      strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  )}
                  {/* Planned endpoint label */}
                  <text x={xOf(burnData.length - 1) - 6} y={yOf(burnData[burnData.length - 1].cumPlan) - 10}
                    textAnchor="end" fontSize="10.5" fill="#9CA3AF" fontWeight="500">
                    {fmtMoney(burnData[burnData.length - 1].cumPlan)}
                  </text>
                  {/* Interactive data points */}
                  {burnData.map((d, i) => {
                    const isHov = hovBar === i;
                    return d.cumActual !== null ? (
                      <g key={i} style={{ cursor: 'pointer' }}
                        onMouseEnter={() => setHovBar(i)} onMouseLeave={() => setHovBar(null)}>
                        <circle cx={xOf(i)} cy={yOf(d.cumActual)} r="14" fill="transparent" />
                        {isHov && <circle cx={xOf(i)} cy={yOf(d.cumActual)} r="11" fill="#0891B2" opacity="0.1" />}
                        <circle cx={xOf(i)} cy={yOf(d.cumActual)} r={isHov ? 7 : 5}
                          fill="white" stroke="#0891B2" strokeWidth={isHov ? 3 : 2} />
                        {(isHov || i % 2 === 0) && (
                          <text x={xOf(i)} y={yOf(d.cumActual) - (isHov ? 16 : 13)}
                            textAnchor="middle" fontSize={isHov ? '12' : '10'}
                            fontWeight={isHov ? '700' : '500'}
                            fill={isHov ? '#0891B2' : '#9CA3AF'}>
                            {fmtMoney(d.cumActual)}
                          </text>
                        )}
                      </g>
                    ) : (
                      <g key={i} style={{ cursor: 'pointer' }}
                        onMouseEnter={() => setHovBar(i)} onMouseLeave={() => setHovBar(null)}>
                        <circle cx={xOf(i)} cy={yOf(d.cumPlan)} r="12" fill="transparent" />
                        {hovBar === i && (
                          <circle cx={xOf(i)} cy={yOf(d.cumPlan)} r="5"
                            fill="white" stroke="#C4C9D4" strokeWidth="1.5" />
                        )}
                      </g>
                    );
                  })}
                  </svg>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Financial Exposure */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60">
            <h4 className="text-sm font-semibold text-[#111827]">Financial Exposure</h4>
            <p className="text-[10px] text-[#9CA3AF] mt-0.5">Commitment & contingency status</p>
          </div>
          <div className="p-5 flex flex-col gap-5">
            {/* Commitment bars */}
            <div className="space-y-4">
              {[
                { label: 'Total Committed',    value: fmtMoney(totalCommitted), pct: totalBudget > 0 ? Math.round((totalCommitted / totalBudget) * 100) : 0, color: '#3BB2A5' },
                { label: 'Uncommitted Budget', value: fmtMoney(uncommitted),    pct: totalBudget > 0 ? Math.round((uncommitted / totalBudget) * 100) : 0,    color: '#059669' },
                { label: 'Pending VO Value',   value: fmtMoney(0),              pct: 0, color: '#D97706', sub: 'No variation orders' },
                { label: 'Approved VO Value',  value: fmtMoney(0),              pct: 0, color: '#7C3AED', sub: 'No approved VOs' },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-[#374151] font-medium">{item.label}</span>
                    <span className="text-[11px] font-bold" style={{ color: item.color }}>{item.value}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(item.pct, 100)}%`, backgroundColor: item.color }} />
                  </div>
                  <p className="text-[9px] text-[#C4C9D4] mt-0.5">{item.sub || `${item.pct}% of total budget`}</p>
                </div>
              ))}
            </div>
            {/* Budget utilisation */}
            <div className="pt-1 border-t border-gray-100">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-[#374151]">Budget Utilisation</span>
                <span className="text-[11px] font-bold" style={{ color: utilPct > 100 ? '#DC2626' : utilPct > 90 ? '#D97706' : '#059669' }}>
                  {utilPct}%
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(utilPct, 100)}%`, backgroundColor: utilPct > 100 ? '#DC2626' : utilPct > 90 ? '#D97706' : '#3BB2A5' }} />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ── Cost Breakdown Table + Alerts Sidebar ───────────────────────────── */}
      <div className="flex gap-4 items-start">

        {/* Main breakdown table */}
        <div className="flex-1 min-w-0 bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h4 className="text-sm font-semibold text-[#111827]">Cost Breakdown</h4>
              <p className="text-[10px] text-[#9CA3AF]">{sorted.length} of {rows.length} items · Click columns to sort</p>
            </div>
            <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden">
              {[
                { key: 'all',      label: 'All' },
                { key: 'over',     label: 'Over Budget' },
                { key: 'cpi',      label: 'CPI < 0.95' },
                { key: 'overburn', label: 'Overburn Risk' },
              ].map(({ key, label }) => (
                <button key={key} onClick={() => setTableFilter(key)}
                  className={`text-[10px] font-medium px-3 py-1.5 border-r border-gray-200 last:border-r-0 transition-colors ${
                    tableFilter === key ? 'bg-[#3BB2A5] text-white' : 'bg-white text-[#6B7280] hover:bg-gray-50'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 480 }}>
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80 border-b border-gray-100 sticky top-0 z-10">
              <tr>
                <th className="w-8 px-4 py-3" />
                {[
                  { key: 'category',   label: 'Category',    right: false },
                  { key: 'budget',     label: 'Budget',      right: true },
                  { key: 'committed',  label: 'Committed',   right: true },
                  { key: 'actual',     label: 'Actual',      right: true },
                  { key: 'forecast',   label: 'Forecast',    right: true },
                  { key: 'varAmt',     label: 'Variance $',  right: true },
                  { key: 'varPct',     label: 'Var %',       right: true },
                  { key: 'spendPct',   label: 'Cost %',      right: false },
                  { key: 'progress',   label: 'Progress %',  right: false },
                  { key: 'cpi',        label: 'CPI',         right: true },
                  { key: 'contractor', label: 'Contractor',  right: false },
                ].map(({ key, label, right }) => (
                  <th key={key} onClick={() => handleSort(key)}
                    className={`${right ? 'text-right' : 'text-left'} px-4 py-3 text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider cursor-pointer select-none hover:text-[#374151] whitespace-nowrap`}>
                    {label}{sortArrow(key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sorted.map((r, i) => {
                const isExpanded = expandedRow === i;
                const rl = riskLevel(r.varPct);
                return (
                  <React.Fragment key={i}>
                    <tr
                      className={`hover:bg-gray-50/60 transition-colors cursor-pointer ${isExpanded ? 'bg-[#F0FDFB]' : ''}`}
                      onClick={() => setExpandedRow(isExpanded ? null : i)}
                    >
                      <td className="px-4 py-3 text-[#9CA3AF]">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
                          className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                          <path d="M4 2.5L7.5 6 4 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {rl && r.varAmt > 0 && (
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: rl.color }} />
                          )}
                          <div>
                            <p className="text-xs font-semibold text-[#111827]">{r.category}</p>
                            {r.code && <p className="text-[10px] text-[#9CA3AF] font-mono">{r.code}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-[#6B7280]">{r.budget > 0 ? fmtMoney(r.budget) : '—'}</td>
                      <td className="px-4 py-3 text-right text-xs text-[#374151]">{r.committed > 0 ? fmtMoney(r.committed) : '—'}</td>
                      <td className="px-4 py-3 text-right text-xs font-semibold text-[#111827]">{fmtMoney(r.actual)}</td>
                      <td className="px-4 py-3 text-right text-xs text-[#6B7280]">{r.forecast > 0 ? fmtMoney(r.forecast) : fmtMoney(r.budget)}</td>
                      <td className="px-4 py-3 text-right">
                        {r.budget > 0 ? (
                          <span className="text-xs font-semibold" style={{ color: varColor(r.varAmt) }}>
                            {r.varAmt > 0 ? '+' : ''}{fmtMoney(r.varAmt)}
                          </span>
                        ) : <span className="text-xs text-[#D1D5DB]">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {r.varPct !== null ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ color: varColor(r.varAmt), backgroundColor: varBg(r.varAmt) }}>
                            {r.varAmt > 0 ? '+' : ''}{r.varPct.toFixed(1)}%
                          </span>
                        ) : <span className="text-xs text-[#D1D5DB]">—</span>}
                      </td>
                      {/* Cost % bar */}
                      <td className="px-4 py-3 min-w-[90px]">
                        {r.budget > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(r.spendPct, 100)}%`,
                                  backgroundColor: r.spendPct > 110 ? '#EF4444' : r.spendPct > 100 ? '#F59E0B' : '#3BB2A5' }} />
                            </div>
                            <span className="text-[10px] font-semibold w-8 text-right shrink-0"
                              style={{ color: r.spendPct > 110 ? '#DC2626' : r.spendPct > 100 ? '#D97706' : '#6B7280' }}>
                              {Math.round(r.spendPct)}%
                            </span>
                          </div>
                        ) : <span className="text-xs text-[#D1D5DB]">—</span>}
                      </td>
                      {/* Progress % bar */}
                      <td className="px-4 py-3 min-w-[90px]">
                        {r.progress > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-[#7C3AED] transition-all duration-500"
                                style={{ width: `${Math.min(r.progress, 100)}%` }} />
                            </div>
                            <span className="text-[10px] font-semibold text-[#6B7280] w-8 text-right shrink-0">{Math.round(r.progress)}%</span>
                          </div>
                        ) : <span className="text-xs text-[#D1D5DB]">—</span>}
                      </td>
                      {/* CPI */}
                      <td className="px-4 py-3 text-right">
                        {r.cpi !== null ? (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-lg"
                            style={{ color: cpiColor(r.cpi), backgroundColor: cpiBg(r.cpi) }}>
                            {r.cpi.toFixed(2)}
                          </span>
                        ) : <span className="text-xs text-[#D1D5DB]">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#6B7280]">{r.contractor || '—'}</td>
                    </tr>
                    {/* Expanded row drilldown */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={12} className="bg-[#F8FDFC] px-8 py-4 border-b border-[#E0F7F4]">
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                              { label: 'Labour', value: fmtMoney(r.actual * 0.35), note: 'Est. 35% of actual' },
                              { label: 'Materials', value: fmtMoney(r.actual * 0.40), note: 'Est. 40% of actual' },
                              { label: 'Subcontract', value: fmtMoney(r.actual * 0.20), note: 'Est. 20% of actual' },
                              { label: 'Plant / Equipment', value: fmtMoney(r.actual * 0.05), note: 'Est. 5% of actual' },
                            ].map((item) => (
                              <div key={item.label} className="bg-white rounded-lg border border-gray-100 px-4 py-3">
                                <p className="text-[10px] text-[#9CA3AF] font-medium mb-1">{item.label}</p>
                                <p className="text-sm font-bold text-[#111827]">{item.value}</p>
                                <p className="text-[9px] text-[#C4C9D4] mt-0.5">{item.note}</p>
                              </div>
                            ))}
                          </div>
                          {r.description && (
                            <p className="text-[11px] text-[#6B7280] mt-3 italic">Note: {r.description}</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-200 sticky bottom-0">
              <tr>
                <td className="px-4 py-3" colSpan={2}>
                  <span className="text-xs font-bold text-[#111827]">TOTAL</span>
                  <span className="text-[10px] text-[#9CA3AF] ml-2">{sorted.length} items</span>
                </td>
                <td className="px-4 py-3 text-right text-xs font-bold text-[#374151]">{fmtMoney(totalBudget)}</td>
                <td className="px-4 py-3 text-right text-xs font-bold text-[#6B7280]">{fmtMoney(totalCommitted)}</td>
                <td className="px-4 py-3 text-right text-xs font-bold text-[#111827]">{fmtMoney(totalActual)}</td>
                <td className="px-4 py-3 text-right text-xs text-[#6B7280]">{fmtMoney(totalForecast)}</td>
                <td className="px-4 py-3 text-right">
                  <span className="text-xs font-bold" style={{ color: varColor(totalVarAmt) }}>
                    {totalVarAmt > 0 ? '+' : ''}{fmtMoney(totalVarAmt)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {totalVarPct !== null && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ color: varColor(totalVarAmt), backgroundColor: varBg(totalVarAmt) }}>
                      {totalVarPct > 0 ? '+' : ''}{totalVarPct.toFixed(1)}%
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {totalBudget > 0 && (
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full"
                          style={{ width: `${Math.min(utilPct, 100)}%`, backgroundColor: utilPct > 100 ? '#EF4444' : '#3BB2A5' }} />
                      </div>
                      <span className="text-[10px] font-bold w-8 text-right" style={{ color: varColor(totalVarAmt) }}>{utilPct}%</span>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3" />
                <td className="px-4 py-3 text-right">
                  {cpiOverall !== null && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-lg"
                      style={{ color: cpiColor(cpiOverall), backgroundColor: cpiBg(cpiOverall) }}>
                      {cpiOverall.toFixed(2)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3" />
              </tr>
            </tfoot>
          </table>
        </div>
        </div>

        {/* Alerts sidebar — scrollable like Resources/Materials insights */}
        {alerts.length > 0 && (
          <div className="w-72 shrink-0 flex flex-col gap-3" style={{ maxHeight: 556 }}>
            <div className="flex items-center justify-between px-1 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[#111827]">Cost Alerts</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-[#6B7280] border border-gray-200">{alerts.length}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {['critical','high','watch'].map((s) => {
                  const n = alerts.filter((a) => a.sev === s).length;
                  if (!n) return null;
                  const cfg = ALERT_SEV[s];
                  return (
                    <span key={s} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border"
                      style={{ color: cfg.color, backgroundColor: cfg.bg, borderColor: cfg.border }}>
                      {n}
                    </span>
                  );
                })}
              </div>
            </div>
            <div className="overflow-y-auto pr-0.5">
              <div className="flex flex-col gap-2.5">
                {alerts.map((alert) => {
                  const cfg = ALERT_SEV[alert.sev] || ALERT_SEV.watch;
                  return (
                    <div key={alert.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden flex">
                      <div className="w-1 shrink-0" style={{ backgroundColor: cfg.color }} />
                      <div className="flex-1 px-3.5 py-3">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border bg-white"
                            style={{ color: cfg.color, borderColor: cfg.border }}>
                            {alert.tag}
                          </span>
                        </div>
                        <p className="text-[11px] font-semibold text-[#111827] leading-snug mb-1">{alert.title}</p>
                        <p className="text-[10px] text-[#6B7280] leading-relaxed">{alert.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Resource status config ───────────────────────────────────────────────────
const RES_STATUS = {
  active:     { label: 'Active',      cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  mobilizing: { label: 'Mobilizing',  cls: 'bg-blue-50 text-blue-700 border border-blue-200' },
  scheduled:  { label: 'Scheduled',   cls: 'bg-purple-50 text-purple-700 border border-purple-200' },
  delayed:    { label: 'Delayed',     cls: 'bg-red-50 text-red-700 border border-red-200' },
  suspended:  { label: 'Suspended',   cls: 'bg-orange-50 text-orange-700 border border-orange-200' },
  completed:  { label: 'Completed',   cls: 'bg-gray-100 text-gray-500 border border-gray-200' },
  pending:    { label: 'Pending',     cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
  'on-hold':  { label: 'On Hold',     cls: 'bg-gray-100 text-gray-500 border border-gray-200' },
};

function ResStatusBadge({ status }) {
  const s = RES_STATUS[(status || '').toLowerCase()] || RES_STATUS.pending;
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${s.cls}`}>{s.label}</span>;
}

function fmtResDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: '2-digit' });
}

// ── Headcount role breakdown helper ──────────────────────────────────────────
function buildRoster(headcount) {
  const n = Number(headcount || 0);
  if (n === 0) return [];
  const roles = [];
  let rem = n;
  const add = (role, count) => { if (count > 0 && rem > 0) { const c = Math.min(count, rem); roles.push({ role, count: c }); rem -= c; } };
  add('Site Supervisor', 1);
  add('Foreman', Math.max(1, Math.floor(n / 6)));
  add('Senior Technician', Math.floor(n * 0.15));
  add('Technician / Tradesperson', Math.floor(n * 0.35));
  add('Labourer / Helper', rem);
  return roles;
}

// ── Row expand detail with edit mode ─────────────────────────────────────────
function RowDetailPanel({ a, hasConflict, allZones, allFloors, allDiscs }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState({ ...a });

  const shiftTime = (s) =>
    s === 'night' ? '19:00 – 05:00' : s === 'both' ? '07:00 – 05:00 (Both shifts)' : '07:00 – 17:00';

  const fld = (label, val) => (
    <div>
      <p className="text-[10px] text-[#9CA3AF] mb-0.5">{label}</p>
      <p className="text-xs font-medium text-[#111827] leading-snug">{val || '—'}</p>
    </div>
  );

  const inp = (label, key, type = 'text', opts = null) => (
    <div>
      <p className="text-[10px] text-[#9CA3AF] mb-0.5">{label}</p>
      {opts ? (
        <select
          value={draft[key] || ''}
          onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
          className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#3BB2A5] bg-white"
        >
          <option value="">— Select —</option>
          {opts.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : type === 'textarea' ? (
        <textarea
          value={draft[key] || ''}
          onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
          rows={2}
          className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#3BB2A5] resize-none"
        />
      ) : (
        <input
          type={type}
          value={type === 'date' && draft[key] ? draft[key].slice(0, 10) : (draft[key] || '')}
          onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
          className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#3BB2A5]"
        />
      )}
    </div>
  );

  const roster = buildRoster(draft.headcount);

  return (
    <tr>
      <td colSpan={9} className="px-0 py-0 border-t border-gray-100">
        <div className="bg-white px-6 py-5 border-b border-gray-100">

          {/* Panel header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#111827]">{draft.discipline}</span>
              <span className="text-[10px] text-[#9CA3AF]">·</span>
              <span className="text-[10px] text-[#6B7280]">{draft.zone}{draft.floor ? `, ${draft.floor}` : ''}</span>
              {hasConflict && (
                <span className="text-[10px] font-semibold bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded-full">Trade Conflict</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {editing ? (
                <>
                  <button
                    onClick={() => setEditing(false)}
                    className="text-xs text-[#9CA3AF] hover:text-[#374151] px-3 py-1.5 rounded-lg border border-gray-200 transition-colors"
                  >Cancel</button>
                  <button
                    onClick={() => {
                      // Save is local-only (no API wired yet) — indicate success
                      setEditing(false);
                    }}
                    className="text-xs font-semibold text-white bg-[#3BB2A5] hover:bg-[#2d9e92] px-4 py-1.5 rounded-lg transition-colors"
                  >Save Changes</button>
                </>
              ) : (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 text-xs font-medium text-[#3BB2A5] hover:text-[#2d9e92] px-3 py-1.5 rounded-lg border border-[#3BB2A5]/30 hover:bg-[#F0FDFB] transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M8.5 1.5a1.414 1.414 0 012 2L3.5 10.5l-3 .5.5-3 7.5-6.5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Edit
                </button>
              )}
            </div>
          </div>

          {/* 4-column layout */}
          <div className="grid grid-cols-4 gap-6">

            {/* Col 1 – Scope & Location */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">Scope & Location</p>
              {editing ? (
                <>
                  {inp('Work Scope', 'workScope', 'textarea')}
                  {inp('Zone', 'zone', 'text', allZones)}
                  {inp('Floor', 'floor', 'text', allFloors)}
                </>
              ) : (
                <>
                  {fld('Work Scope', draft.workScope)}
                  <div className="grid grid-cols-2 gap-3">
                    {fld('Zone', draft.zone)}
                    {fld('Floor', draft.floor)}
                  </div>
                </>
              )}
            </div>

            {/* Col 2 – Schedule */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">Schedule</p>
              {editing ? (
                <>
                  {inp('Start Date', 'startDate', 'date')}
                  {inp('End Date', 'endDate', 'date')}
                  {inp('Shift', 'shift', 'text', ['day', 'night', 'both'])}
                </>
              ) : (
                <>
                  {fld('Start Date', fmtResDate(draft.startDate))}
                  {fld('End Date', fmtResDate(draft.endDate))}
                  {fld('Shift Hours', shiftTime((draft.shift || 'day').toLowerCase()))}
                  <div>
                    <p className="text-[10px] text-[#9CA3AF] mb-0.5">Shift Type</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      (draft.shift||'').toLowerCase() === 'night' ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : (draft.shift||'').toLowerCase() === 'both' ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'bg-gray-50 text-gray-500 border-gray-200'
                    }`}>
                      {draft.shift ? draft.shift.charAt(0).toUpperCase() + draft.shift.slice(1) : 'Day'}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Col 3 – Contractor */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">Contractor</p>
              {editing ? (
                <>
                  {inp('Contractor Name', 'contractor')}
                  {inp('Responsible Person', 'responsiblePerson')}
                  {inp('Status', 'status', 'text', Object.keys(RES_STATUS))}
                </>
              ) : (
                <>
                  {fld('Contractor', draft.contractor)}
                  {fld('Responsible Person', draft.responsiblePerson)}
                  <div>
                    <p className="text-[10px] text-[#9CA3AF] mb-0.5">Status</p>
                    <ResStatusBadge status={draft.status} />
                  </div>
                </>
              )}
            </div>

            {/* Col 4 – Headcount Roster */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider">Headcount Roster</p>
                {editing && (
                  <div className="flex items-center gap-1">
                    <p className="text-[10px] text-[#9CA3AF]">Total</p>
                    <input
                      type="number"
                      min="0"
                      value={draft.headcount || 0}
                      onChange={(e) => setDraft((d) => ({ ...d, headcount: Number(e.target.value) }))}
                      className="w-14 text-xs text-center border border-gray-200 rounded-lg px-1.5 py-1 focus:outline-none focus:border-[#3BB2A5]"
                    />
                  </div>
                )}
              </div>

              {/* Total headcount pill */}
              <div className="flex items-center gap-2 py-2 px-3 bg-[#F0FDFB] rounded-lg border border-[#99F6E4]/60">
                <span className="text-lg font-black text-[#3BB2A5]">{draft.headcount || 0}</span>
                <div>
                  <p className="text-[10px] font-semibold text-[#134E4A]">Total Workers</p>
                  <p className="text-[9px] text-[#3BB2A5]">{(draft.shift||'day').toUpperCase()} SHIFT</p>
                </div>
              </div>

              {/* Role breakdown */}
              <div className="space-y-1.5">
                {roster.map(({ role, count }) => (
                  <div key={role} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#3BB2A5] shrink-0" />
                      <span className="text-[11px] text-[#374151] truncate">{role}</span>
                    </div>
                    <span className="text-[11px] font-semibold text-[#111827] shrink-0 ml-2">{count}</span>
                  </div>
                ))}
                {roster.length === 0 && (
                  <p className="text-[11px] text-[#9CA3AF]">No headcount assigned</p>
                )}
              </div>

              <p className="text-[9px] text-[#C4C9D4] leading-relaxed">
                Role distribution is estimated based on total headcount. Update total to recalculate.
              </p>
            </div>

          </div>
        </div>
      </td>
    </tr>
  );
}

function ResourcesView({ data }) {
  const [activeView, setActiveView]         = useState('table');   // 'table' | 'zone'
  const [filterFloor, setFilterFloor]       = useState('');
  const [filterZone, setFilterZone]         = useState('');
  const [filterDisc, setFilterDisc]         = useState('');
  const [filterStatus, setFilterStatus]     = useState('');
  const [expandedRows, setExpandedRows]     = useState({});
  const [dismissedAlerts, setDismissedAlerts] = useState(new Set());

  if (!data.length) return <EmptyState title="No resource data" description="Upload a CSV to see site resource deployment." />;

  const today = Date.now();

  // ── Derived ──────────────────────────────────────────────────────────────
  const allDiscs      = [...new Set(data.map((a) => a.discipline).filter(Boolean))];
  const allZones      = [...new Set(data.map((a) => a.zone).filter(Boolean))];
  const allFloors     = [...new Set(data.map((a) => a.floor).filter(Boolean))];
  const allContractors= [...new Set(data.map((a) => a.contractor).filter(Boolean))];

  const active        = data.filter((a) => a.status === 'active');
  const delayed       = data.filter((a) => a.status === 'delayed');
  const mobilizing    = data.filter((a) => a.status === 'mobilizing');
  const pendingMob    = data.filter((a) => ['pending','scheduled'].includes(a.status));
  const totalHead     = active.reduce((s, a) => s + Number(a.headcount || 0), 0);

  // Conflict detection: zones with 2+ disciplines overlapping in time
  const zoneConflicts = new Set();
  allZones.forEach((z) => {
    const zAssign = data.filter((a) => a.zone === z);
    for (let i = 0; i < zAssign.length; i++) {
      for (let j = i + 1; j < zAssign.length; j++) {
        const a = zAssign[i], b = zAssign[j];
        if (a.discipline === b.discipline) continue;
        const aS = new Date(a.startDate), aE = new Date(a.endDate);
        const bS = new Date(b.startDate), bE = new Date(b.endDate);
        if (aS <= bE && bS <= aE) zoneConflicts.add(z);
      }
    }
  });

  const zonesNoResource  = allZones.filter((z) => !data.some((a) => a.zone === z && a.status === 'active')).length;
  const siteCoverage     = allZones.length > 0 ? Math.round((active.length / data.length) * 100) : 0;

  // ── Filtered rows ────────────────────────────────────────────────────────
  const filtered = data.filter((a) =>
    (!filterFloor  || a.floor === filterFloor) &&
    (!filterZone   || a.zone === filterZone) &&
    (!filterDisc   || a.discipline === filterDisc) &&
    (!filterStatus || a.status === filterStatus)
  );

  // ── Sequence violation detection ─────────────────────────────────────────
  const violations = [];
  allZones.forEach((z) => {
    const civil   = data.find((a) => a.zone === z && a.discipline === 'Civil');
    const elec    = data.find((a) => a.zone === z && a.discipline === 'Electrical');
    const commiss = data.find((a) => a.discipline === 'Commissioning');
    const mechInstall = data.find((a) => a.zone === z && a.discipline === 'Mechanical');
    if (civil && elec) {
      const civEnd = new Date(civil.endDate), elecStart = new Date(elec.startDate);
      if (elecStart < civEnd) violations.push({ zone: z, msg: 'Electrical starts before Civil completion', type: 'sequence' });
    }
    if (commiss && mechInstall) {
      const mechEnd = new Date(mechInstall.endDate), commStart = new Date(commiss.startDate);
      if (commStart < mechEnd) violations.push({ zone: z, msg: 'Commissioning overlaps Mechanical installation', type: 'sequence' });
    }
  });

  // Zone capacity thresholds (pax) — can later be configurable
  const ZONE_CAPACITY = { 'Zone A': 30, 'Zone B': 25, 'Zone C': 20, 'Exterior': 20, 'Roof': 10, 'Core': 15, 'All Zones': 50 };

  // Zone Health Score: 0-100
  const zoneHealthOf = (zone) => {
    const zRows = data.filter((a) => a.zone === zone);
    const zHead  = zRows.reduce((s, a) => s + Number(a.headcount || 0), 0);
    const cap    = ZONE_CAPACITY[zone] || 30;
    const overload  = Math.min((zHead / cap) * 40, 40);           // 0–40 penalty
    const conflPen  = zoneConflicts.has(zone) ? 25 : 0;          // 25 penalty
    const delayPen  = zRows.some((a) => a.status === 'delayed') ? 15 : 0;
    const pendingPct = zRows.length > 0 ? zRows.filter((a) => ['pending','scheduled'].includes(a.status)).length / zRows.length : 0;
    const pendingPen = Math.round(pendingPct * 20);               // 0–20 penalty
    const score = Math.max(0, 100 - overload - conflPen - delayPen - pendingPen);
    const tier  = score >= 75 ? 'healthy' : score >= 50 ? 'moderate' : 'critical';
    return { score: Math.round(score), tier, zHead, cap };
  };

  const kpis = [
    { label: 'Active Disciplines',    value: [...new Set(active.map((a) => a.discipline))].length, color: '#3BB2A5', sub: 'trades on site',    alert: false },
    { label: 'Active Contractors',    value: [...new Set(active.map((a) => a.contractor))].length, color: '#2563EB', sub: 'firms deployed',    alert: false },
    { label: 'Active Zones',          value: [...new Set(active.map((a) => a.zone))].length,       color: '#7C3AED', sub: 'zones occupied',    alert: false },
    { label: 'Deployed Manpower',     value: totalHead,                                             color: '#059669', sub: 'pax active today',  alert: false },
    { label: 'Pending Mobilizations', value: pendingMob.length,                                     color: '#D97706', sub: 'awaiting site access', alert: pendingMob.length > 0 },
    { label: 'Zone Conflicts',        value: zoneConflicts.size,                                    color: '#DC2626', sub: 'trade clash zones',  alert: zoneConflicts.size > 0 },
    { label: 'Zones Unassigned',      value: zonesNoResource,                                       color: '#9CA3AF', sub: 'no active resource', alert: zonesNoResource > 0 },
    { label: 'Site Coverage',         value: `${siteCoverage}%`,                                    color: siteCoverage >= 70 ? '#059669' : '#D97706', sub: 'deployment rate', alert: siteCoverage < 50 },
  ];

  const VIEW_OPTIONS = [
    { key: 'table', label: 'Table View' },
    { key: 'zone',  label: 'Zone View' },
  ];

  const toggleRow = (id) => setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  const dismissAlert = (id) => setDismissedAlerts((prev) => new Set([...prev, id]));

  // Alert items (dismissible)
  const alertItems = [
    ...[...zoneConflicts].map((z) => ({
      id: `stack-${z}`,
      type: 'conflict',
      label: `Trade Stacking — ${z}`,
      sub: 'Multiple disciplines overlap in this zone',
      badgeCls: 'bg-red-50 border-red-200',
      labelCls: 'text-red-700',
      subCls: 'text-red-500',
      tagCls: 'bg-red-100 text-red-700',
      tag: 'Zone Conflict',
      icon: '⚠',
      iconCls: 'text-red-400',
    })),
    ...violations.map((v, i) => ({
      id: `viol-${i}`,
      type: 'violation',
      label: `Sequence Violation — ${v.zone}`,
      sub: v.msg,
      badgeCls: 'bg-amber-50 border-amber-200',
      labelCls: 'text-amber-700',
      subCls: 'text-amber-500',
      tagCls: 'bg-amber-100 text-amber-700',
      tag: 'Seq. Violation',
      icon: '⚡',
      iconCls: 'text-amber-400',
    })),
    ...delayed.map((a, i) => ({
      id: `delay-${i}`,
      type: 'delayed',
      label: `${a.discipline} — ${a.zone}`,
      sub: `Delayed · ${a.contractor || 'Unknown contractor'}`,
      badgeCls: 'bg-orange-50 border-orange-200',
      labelCls: 'text-orange-700',
      subCls: 'text-orange-500',
      tagCls: 'bg-orange-100 text-orange-700',
      tag: 'Delayed',
      icon: '●',
      iconCls: 'text-orange-400',
    })),
  ].filter((a) => !dismissedAlerts.has(a.id));

  return (
    <div className="space-y-5">

      {/* ── KPI Cards — 2 rows × 4 cols ────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div key={k.label}
            className={`bg-white rounded-xl border p-4 ${k.alert ? 'border-red-100 bg-red-50/30' : 'border-gray-100'}`}>
            <div className="flex items-start justify-between mb-3">
              <p className="text-[11px] text-[#9CA3AF] font-medium leading-tight">{k.label}</p>
              {k.alert && (
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-0.5 shrink-0" />
              )}
            </div>
            <p className="text-[22px] font-black leading-none mb-1" style={{ color: k.color }}>{k.value}</p>
            <p className="text-[10px] text-[#C4C9D4] font-medium">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Dismissible alert banners ───────────────────────────────────────── */}
      {alertItems.length > 0 && (
        <div className="space-y-2">
          {alertItems.map((al) => (
            <div key={al.id} className={`flex items-center gap-3 border rounded-xl px-4 py-2.5 ${al.badgeCls}`}>
              <span className={`text-sm shrink-0 ${al.iconCls}`}>{al.icon}</span>
              <div className="flex-1 min-w-0">
                <span className={`text-xs font-semibold ${al.labelCls}`}>{al.label}</span>
                <span className={`text-xs ml-2 ${al.subCls}`}>{al.sub}</span>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${al.tagCls}`}>{al.tag}</span>
              <button
                onClick={() => dismissAlert(al.id)}
                className="ml-1 text-gray-400 hover:text-gray-600 transition-colors shrink-0 text-base leading-none"
                title="Dismiss"
              >×</button>
            </div>
          ))}
        </div>
      )}

      {/* ── Filter + View toggle bar ────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3 flex-wrap">
        {[
          { label: 'Floor',      value: filterFloor,  set: setFilterFloor,  opts: allFloors },
          { label: 'Zone',       value: filterZone,   set: setFilterZone,   opts: allZones },
          { label: 'Discipline', value: filterDisc,   set: setFilterDisc,   opts: allDiscs },
          { label: 'Status',     value: filterStatus, set: setFilterStatus, opts: Object.keys(RES_STATUS) },
        ].map(({ label, value, set, opts }) => (
          <select
            key={label}
            value={value}
            onChange={(e) => set(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-[#374151] bg-white focus:outline-none focus:border-[#3BB2A5] cursor-pointer"
          >
            <option value="">All {label}s</option>
            {opts.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        ))}
        <div className="ml-auto flex items-center">
          {(filterFloor || filterZone || filterDisc || filterStatus) && (
            <button onClick={() => { setFilterFloor(''); setFilterZone(''); setFilterDisc(''); setFilterStatus(''); }}
              className="text-xs text-[#9CA3AF] hover:text-red-500 font-medium px-3 py-1.5 mr-2 transition-colors">
              Clear filters
            </button>
          )}
          <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden bg-white">
            {VIEW_OPTIONS.map(({ key, label }) => (
              <button key={key} onClick={() => setActiveView(key)}
                className={`px-4 py-1.5 text-xs font-medium transition-colors border-r border-gray-200 last:border-r-0 ${
                  activeView === key ? 'bg-[#F0FDFB] text-[#3BB2A5] font-semibold' : 'text-[#6B7280] hover:bg-gray-50'
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ══ TABLE VIEW ══ */}
      {activeView === 'table' && (
        <div className="flex gap-4 items-start">
        {/* ── Main table ── */}
        <div className="flex-1 min-w-0 rounded-xl border border-gray-100 overflow-hidden bg-white">
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-[#111827]">Resource Deployment</h4>
            <span className="text-xs text-[#9CA3AF]">
              {filtered.length} of {data.length} assignment{data.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 500 }}>
            <table className="w-full text-sm">
              <thead className="bg-gray-50/80 border-b border-gray-100 sticky top-0 z-10">
                <tr>
                  <th className="w-8 px-4 py-3" />
                  {['Discipline','Zone / Floor','Contractor','Responsible','Shift','H/C','Period','Status'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((a, i) => {
                  const rowId = a._id || i;
                  const isOpen = !!expandedRows[rowId];
                  const hasConflict = zoneConflicts.has(a.zone);
                  return (
                    <React.Fragment key={rowId}>
                      {/* Main row */}
                      <tr
                        className={`cursor-pointer transition-colors group ${isOpen ? 'bg-[#F0FDFB]' : 'hover:bg-gray-50/70'} ${hasConflict && !isOpen ? 'bg-red-50/20' : ''}`}
                        onClick={() => toggleRow(rowId)}
                      >
                        {/* Expand chevron */}
                        <td className="px-4 py-3 text-[#9CA3AF] group-hover:text-[#3BB2A5] transition-colors">
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={`transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>
                            <path d="M5 3.5L8.5 7 5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {hasConflict && (
                              <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" title="Zone conflict" />
                            )}
                            <span className="text-xs font-semibold text-[#111827]">{a.discipline}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs text-[#374151]">{a.zone || '—'}</p>
                          <p className="text-[10px] text-[#9CA3AF]">{a.floor || ''}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-[#374151]">{a.contractor || '—'}</td>
                        <td className="px-4 py-3 text-xs text-[#374151]">{a.responsiblePerson || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            (a.shift||'').toLowerCase() === 'night'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : (a.shift||'').toLowerCase() === 'both'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-gray-50 text-gray-500 border-gray-200'
                          }`}>
                            {a.shift ? (a.shift.charAt(0).toUpperCase() + a.shift.slice(1)) : 'Day'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-bold text-[#111827]">{a.headcount || 0}</span>
                          <span className="text-[10px] text-[#9CA3AF] ml-1">pax</span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs text-[#374151] whitespace-nowrap">{fmtResDate(a.startDate)}</p>
                          <p className="text-[10px] text-[#9CA3AF] whitespace-nowrap">→ {fmtResDate(a.endDate)}</p>
                        </td>
                        <td className="px-4 py-3"><ResStatusBadge status={a.status} /></td>
                      </tr>

                      {/* Expanded detail panel */}
                      {isOpen && (
                        <RowDetailPanel
                          a={a}
                          hasConflict={hasConflict}
                          allZones={allZones}
                          allFloors={allFloors}
                          allDiscs={allDiscs}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-12 text-center text-[#9CA3AF] text-xs">No assignments match the current filters</div>
            )}
          </div>
        </div>

        {/* ── Insights sidebar ── */}
        {(() => {
          const insights = [];

          if (zoneConflicts.size > 0) {
            [...zoneConflicts].forEach((z) => {
              const tradeList = data.filter((a) => a.zone === z && a.startDate && a.endDate).map((a) => a.discipline);
              insights.push({ id: `stack-${z}`, severity: 'critical', category: 'Trade Stacking', title: `Multi-trade congestion — ${z}`,
                detail: `${tradeList.length} disciplines overlap: ${tradeList.slice(0,3).join(', ')}${tradeList.length > 3 ? ` +${tradeList.length-3}` : ''}`,
                action: 'Negotiate staggered access windows with contractors.', priority: 1 });
            });
          }
          violations.forEach((v, i) => {
            insights.push({ id: `viol-${i}`, severity: 'critical', category: 'Sequence Violation', title: `Out-of-sequence — ${v.zone}`,
              detail: v.msg, action: 'Adjust start dates or confirm predecessor completion.', priority: 1 });
          });
          if (delayed.length > 0) {
            const byZone = {};
            delayed.forEach((a) => { byZone[a.zone] = (byZone[a.zone] || []).concat(a.discipline); });
            Object.entries(byZone).forEach(([zone, discs]) => {
              insights.push({ id: `delay-${zone}`, severity: 'high', category: 'Active Delay', title: `${discs.length} delayed in ${zone}`,
                detail: `${discs.join(', ')} — behind schedule`, action: 'Issue delay notices and submit recovery programme.', priority: 2 });
            });
          }
          allZones.forEach((z) => {
            const { zHead, cap } = zoneHealthOf(z);
            if (zHead > cap) insights.push({ id: `overload-${z}`, severity: 'high', category: 'Capacity Overload', title: `${z} overcapacity`,
              detail: `${zHead} workers vs ${cap} cap (${Math.round((zHead/cap)*100)}% utilisation)`,
              action: 'Stagger shifts or restrict access.', priority: 2 });
          });
          const soon = pendingMob.filter((a) => { if (!a.startDate) return false; const d = (new Date(a.startDate) - today) / 86400000; return d >= 0 && d <= 14; });
          if (soon.length > 0) insights.push({ id: 'mob-soon', severity: 'medium', category: 'Mobilisation Due',
            title: `${soon.length} trade${soon.length !== 1 ? 's' : ''} in 14 days`,
            detail: soon.map((a) => `${a.discipline} → ${a.zone}`).join(', '),
            action: 'Confirm inductions and material readiness.', priority: 3 });
          const idleZones = allZones.filter((z) => !data.some((a) => a.zone === z && a.status === 'active'));
          if (idleZones.length > 0) insights.push({ id: 'idle', severity: 'info', category: 'Idle Zones',
            title: `${idleZones.length} zone${idleZones.length !== 1 ? 's' : ''} undeployed`,
            detail: idleZones.join(', '),
            action: 'Verify planned-idle status or update assignments.', priority: 4 });

          const SEV = {
            critical: { border: '#DC2626', badgeCls: 'bg-red-50 text-red-700 border border-red-200',    dotCls: 'bg-red-400' },
            high:     { border: '#D97706', badgeCls: 'bg-amber-50 text-amber-700 border border-amber-200', dotCls: 'bg-amber-400' },
            medium:   { border: '#2563EB', badgeCls: 'bg-blue-50 text-blue-700 border border-blue-200',  dotCls: 'bg-blue-400' },
            info:     { border: '#E5E7EB', badgeCls: 'bg-gray-100 text-gray-500 border border-gray-200', dotCls: 'bg-gray-300' },
          };
          const sorted = [...insights].sort((a, b) => a.priority - b.priority);
          const critN  = sorted.filter((i) => i.severity === 'critical').length;
          const highN  = sorted.filter((i) => i.severity === 'high').length;

          return (
            <div className="w-72 shrink-0 flex flex-col gap-3" style={{ maxHeight: 556 }}>
              {/* Panel header — never scrolls */}
              <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#111827]">Insights</span>
                  {sorted.length > 0 && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-[#6B7280] border border-gray-200">{sorted.length}</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {critN > 0 && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">{critN} Critical</span>}
                  {highN > 0 && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">{highN} High</span>}
                  {sorted.length === 0 && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">All Clear</span>}
                </div>
              </div>

              {sorted.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 px-4 py-8 flex flex-col items-center gap-2 text-center">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-sm text-emerald-600">✓</div>
                  <p className="text-xs font-semibold text-[#111827]">No issues detected</p>
                  <p className="text-[10px] text-[#9CA3AF] leading-relaxed">All zones clear, no conflicts or delays.</p>
                </div>
              ) : (
                <div className="overflow-y-auto pr-0.5">
                  <div className="flex flex-col gap-2.5">
                  {sorted.map((ins) => {
                    const s = SEV[ins.severity] || SEV.info;
                    return (
                      <div key={ins.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                        {/* Severity strip */}
                        <div className="h-0.5 w-full" style={{ backgroundColor: s.border }} />
                        <div className="px-3.5 py-3">
                          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${s.badgeCls}`}>{ins.severity.charAt(0).toUpperCase() + ins.severity.slice(1)}</span>
                            <span className="text-[9px] font-semibold text-[#9CA3AF] uppercase tracking-wider">{ins.category}</span>
                          </div>
                          <p className="text-[11px] font-semibold text-[#111827] leading-snug mb-1">{ins.title}</p>
                          <p className="text-[10px] text-[#6B7280] leading-relaxed mb-1.5">{ins.detail}</p>
                          <p className="text-[10px] text-[#3BB2A5] font-medium leading-relaxed">→ {ins.action}</p>
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        </div>
      )}

      {/* ══ ZONE VIEW ══ */}
      {activeView === 'zone' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {allZones.filter((z) => !filterZone || z === filterZone).map((zone) => {
            const zRows     = filtered.filter((a) => a.zone === zone);
            if (!zRows.length) return null;
            const { score, tier, zHead, cap } = zoneHealthOf(zone);
            const zDiscs    = [...new Set(zRows.map((a) => a.discipline))];
            const conflict  = zoneConflicts.has(zone);
            const hasDelayed = zRows.some((a) => a.status === 'delayed');
            const capPct    = cap > 0 ? Math.round((zHead / cap) * 100) : 0;
            const overCap   = capPct > 100;

            const TIER = {
              healthy:  { label: 'Healthy',      color: '#059669', light: '#ECFDF5', bar: '#059669', borderL: '#059669' },
              moderate: { label: 'Moderate Risk', color: '#D97706', light: '#FFFBEB', bar: '#D97706', borderL: '#D97706' },
              critical: { label: 'Critical',      color: '#DC2626', light: '#FEF2F2', bar: '#DC2626', borderL: '#DC2626' },
            }[tier];

            const DISC_COLORS = ['#3BB2A5','#2563EB','#7C3AED','#D97706','#EF4444','#059669','#0891B2','#9333EA'];

            // Timeline bars
            const starts = zRows.map((a) => new Date(a.startDate)).filter((d) => !isNaN(d));
            const ends   = zRows.map((a) => new Date(a.endDate)).filter((d) => !isNaN(d));
            const minD   = starts.length ? Math.min(...starts) : Date.now();
            const maxD   = ends.length   ? Math.max(...ends)   : Date.now() + 1;
            const span   = Math.max(maxD - minD, 1);

            return (
              <div
                key={zone}
                className="bg-white rounded-xl border border-gray-100 overflow-hidden"
              >
                {/* ── Card header ── */}
                <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <h5 className="text-sm font-bold text-[#111827]">{zone}</h5>
                      {conflict && (
                        <span className="text-[10px] font-semibold bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full">Trade Stacking</span>
                      )}
                      {hasDelayed && !conflict && (
                        <span className="text-[10px] font-semibold bg-orange-50 text-orange-600 border border-orange-200 px-2 py-0.5 rounded-full">Delayed</span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#9CA3AF]">
                      {zDiscs.length} discipline{zDiscs.length !== 1 ? 's' : ''} · {zHead} workers deployed
                    </p>
                  </div>
                  {/* Health score pill */}
                  <div
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg shrink-0"
                    style={{ backgroundColor: TIER.light }}
                  >
                    <div className="text-right">
                      <p className="text-base font-black leading-none" style={{ color: TIER.color }}>{score}</p>
                      <p className="text-[9px] font-medium" style={{ color: TIER.color }}>{TIER.label}</p>
                    </div>
                    <div className="w-px h-8 bg-current opacity-10" style={{ color: TIER.color }} />
                    <p className="text-[9px] text-[#9CA3AF] leading-tight">Health<br/>Score</p>
                  </div>
                </div>

                {/* ── Body ── */}
                <div className="px-5 py-4 space-y-4">

                  {/* Health + Capacity bars side by side */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Health bar */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">Zone Health</span>
                        <span className="text-[11px] font-bold" style={{ color: TIER.color }}>{score} / 100</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${score}%`, backgroundColor: TIER.bar }} />
                      </div>
                      <div className="flex justify-between mt-1 text-[9px] text-[#D1D5DB]">
                        <span>0</span><span>50</span><span>75</span><span>100</span>
                      </div>
                    </div>

                    {/* Capacity bar */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider">Capacity</span>
                        <span className="text-[11px] font-bold" style={{ color: overCap ? '#DC2626' : '#374151' }}>
                          {zHead} / {cap} pax
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(capPct, 100)}%`,
                            backgroundColor: overCap ? '#EF4444' : capPct > 80 ? '#D97706' : '#3BB2A5',
                          }} />
                      </div>
                      <div className="flex justify-between mt-1 text-[9px]">
                        <span className="text-[#D1D5DB]">{capPct}% utilised</span>
                        {overCap && <span className="font-semibold text-red-500">+{capPct - 100}% over</span>}
                      </div>
                    </div>
                  </div>

                  {/* Trade assignments table */}
                  <div>
                    <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-2">Deployed Trades</p>
                    <div className="rounded-lg border border-gray-100 overflow-hidden divide-y divide-gray-50">
                      {zRows.map((a, i) => (
                        <div key={i} className="flex items-center px-3 py-2.5 gap-3">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: DISC_COLORS[i % DISC_COLORS.length] }}
                          />
                          <span className="text-xs font-medium text-[#111827] flex-1 min-w-0 truncate">{a.discipline}</span>
                          <span className="text-[10px] text-[#9CA3AF] shrink-0">{a.contractor?.split(' ').slice(0,2).join(' ')}</span>
                          <span className="text-[11px] font-semibold text-[#374151] shrink-0 w-10 text-right">{a.headcount || 0} pax</span>
                          <div className="shrink-0"><ResStatusBadge status={a.status} /></div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Schedule timeline */}
                  {starts.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-2">Schedule Overview</p>
                      <div className="space-y-1.5">
                        {zRows.map((a, i) => {
                          const s = new Date(a.startDate), e = new Date(a.endDate);
                          if (isNaN(s) || isNaN(e)) return null;
                          const left  = ((s - minD) / span) * 100;
                          const width = Math.max(((e - s) / span) * 100, 3);
                          return (
                            <div key={i} className="flex items-center gap-3">
                              <span className="text-[10px] text-[#9CA3AF] w-20 truncate shrink-0">{a.discipline}</span>
                              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden relative">
                                <div
                                  className="absolute h-full rounded-full"
                                  title={`${a.discipline}: ${fmtResDate(a.startDate)} → ${fmtResDate(a.endDate)}`}
                                  style={{
                                    left: `${left}%`, width: `${width}%`,
                                    backgroundColor: DISC_COLORS[i % DISC_COLORS.length],
                                    opacity: a.status === 'completed' ? 0.35 : 0.8,
                                  }}
                                />
                              </div>
                              <span className="text-[9px] text-[#C4C9D4] w-16 text-right shrink-0 whitespace-nowrap">{fmtResDate(a.endDate)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}

// ── Material status config ─────────────────────────────────────────────────────
const MAT_DS = {
  delivered:    { cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200', label: 'Delivered' },
  'in transit': { cls: 'bg-blue-50 text-blue-700 border border-blue-200',          label: 'In Transit' },
  ordered:      { cls: 'bg-amber-50 text-amber-700 border border-amber-200',       label: 'Ordered' },
  delayed:      { cls: 'bg-red-50 text-red-700 border border-red-200',             label: 'Delayed' },
  cancelled:    { cls: 'bg-gray-100 text-gray-400 border border-gray-200',         label: 'Cancelled' },
};
const MAT_STOCK = {
  sufficient: { cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200', label: 'Sufficient' },
  low:        { cls: 'bg-amber-50 text-amber-700 border border-amber-200',        label: 'Low Stock' },
  critical:   { cls: 'bg-red-50 text-red-700 border border-red-200',             label: 'Critical' },
  delayed:    { cls: 'bg-orange-50 text-orange-700 border border-orange-200',    label: 'Delayed' },
};
function MatDsBadge({ status }) {
  const k = (status || '').toLowerCase();
  const cfg = MAT_DS[k] || MAT_DS.ordered;
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${cfg.cls}`}>{cfg.label}</span>;
}
function MatStockBadge({ level }) {
  const cfg = MAT_STOCK[level] || MAT_STOCK.sufficient;
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${cfg.cls}`}>{cfg.label}</span>;
}

function MaterialsView({ data }) {
  const [activeSection, setActiveSection] = useState('stock');   // 'stock' | 'delivery' | 'zone' | 'analytics'
  const [sortKey, setSortKey]             = useState('materialName');
  const [sortDir, setSortDir]             = useState(1);
  const [filterCat, setFilterCat]         = useState('');
  const [filterZone, setFilterZone]       = useState('');

  if (!data.length) return <EmptyState title="No material data" description="Upload a CSV to populate the materials dashboard." />;

  const today = Date.now();
  const fmtD  = (d) => { if (!d) return '—'; return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); };

  // ── Core derivations ──────────────────────────────────────────────────────
  const categories = [...new Set(data.map((m) => m.category).filter(Boolean))];
  const zones      = [...new Set(data.map((m) => m.zone).filter(Boolean))];

  const totalStockValue = data.reduce((s, m) => {
    const currentStock = Math.max(0, Number(m.deliveredQty || 0) - Number(m.installedQty || 0));
    return s + currentStock * Number(m.unitCostUsd || 0);
  }, 0);

  const inTransitItems = data.filter((m) => (m.deliveryStatus || '').toLowerCase() === 'in transit');
  const delayedItems   = data.filter((m) => (m.deliveryStatus || '').toLowerCase() === 'delayed');
  const deliveredItems = data.filter((m) => (m.deliveryStatus || '').toLowerCase() === 'delivered');

  // Stock level per item
  const getStockStatus = (m) => {
    if ((m.deliveryStatus || '').toLowerCase() === 'delayed') return 'delayed';
    const stock = Math.max(0, Number(m.deliveredQty || 0) - Number(m.installedQty || 0));
    const reorder = Number(m.reorderLevel || 0);
    if (reorder > 0 && stock <= reorder * 0.5) return 'critical';
    if (reorder > 0 && stock <= reorder) return 'low';
    return 'sufficient';
  };

  const criticalItems   = data.filter((m) => getStockStatus(m) === 'critical');
  const lowStockItems   = data.filter((m) => getStockStatus(m) === 'low');

  // Milestone risk: expected delivery after milestone date
  const milestonerisk  = data.filter((m) => {
    if (!m.milestoneDate || !m.expectedDelivery) return false;
    return new Date(m.expectedDelivery) > new Date(m.milestoneDate);
  });

  // Stock coverage (days) — simplified: remaining stock / avg daily install rate
  const totalBoq       = data.reduce((s, m) => s + Number(m.boqQty || 0), 0);
  const totalInstalled = data.reduce((s, m) => s + Number(m.installedQty || 0), 0);
  const totalDelivered = data.reduce((s, m) => s + Number(m.deliveredQty || 0), 0);
  const totalStock     = Math.max(0, totalDelivered - totalInstalled);
  const remainingBoq   = Math.max(0, totalBoq - totalInstalled);
  const progressPct    = totalBoq > 0 ? Math.round((totalInstalled / totalBoq) * 100) : 0;
  const deliveredPct   = totalBoq > 0 ? Math.round((totalDelivered / totalBoq) * 100) : 0;

  // BOQ variance
  const boqVariancePct = totalBoq > 0
    ? Math.round(((totalInstalled - totalBoq) / totalBoq) * 100)
    : 0;

  // KPIs
  const kpis = [
    { label: 'Material Categories',    value: categories.length || data.length,  sub: `${data.length} line items`,          color: '#3BB2A5', alert: false },
    { label: 'On-Site Stock Value',     value: `$${(totalStockValue/1000).toFixed(0)}K`, sub: 'current stock × unit cost', color: '#2563EB', alert: false },
    { label: 'Materials In Transit',   value: inTransitItems.length,              sub: 'shipments en route',                color: '#7C3AED', alert: false },
    { label: 'Critical Low Stock',     value: criticalItems.length,               sub: `${lowStockItems.length} low stock`, color: '#DC2626', alert: criticalItems.length > 0 },
    { label: 'Delayed Deliveries',     value: delayedItems.length,                sub: 'past expected date',                color: '#D97706', alert: delayedItems.length > 0 },
    { label: 'Milestone Risk Items',   value: milestonerisk.length,               sub: 'delivery after milestone',          color: '#9333EA', alert: milestonerisk.length > 0 },
    { label: 'Stock Coverage',         value: progressPct < 100 ? `${Math.min(deliveredPct, 99)}%` : '100%',
                                        sub: `${totalStock.toLocaleString()} units on site`,  color: '#059669', alert: false },
    { label: 'BOQ Variance',           value: `${boqVariancePct > 0 ? '+' : ''}${boqVariancePct}%`,
                                        sub: totalInstalled > totalBoq ? 'above BOQ — check wastage' : 'within BOQ',
                                        color: Math.abs(boqVariancePct) > 10 ? '#D97706' : '#059669', alert: Math.abs(boqVariancePct) > 10 },
  ];

  // ── Filtered rows ─────────────────────────────────────────────────────────
  const filtered = data.filter((m) =>
    (!filterCat  || m.category === filterCat) &&
    (!filterZone || m.zone === filterZone)
  );

  const handleSort = (k) => { if (sortKey === k) setSortDir((d) => -d); else { setSortKey(k); setSortDir(1); } };
  const sortArrow  = (k) => sortKey !== k
    ? <span className="text-gray-300 ml-1 text-[10px]">↕</span>
    : <span className="ml-1 text-[10px]" style={{ color: '#3BB2A5' }}>{sortDir === 1 ? '↑' : '↓'}</span>;
  const sortRows   = (rows) => [...rows].sort((a, b) => {
    const va = ['boqQty','deliveredQty','installedQty','unitCostUsd'].includes(sortKey) ? Number(a[sortKey]||0) : (a[sortKey]||'');
    const vb = ['boqQty','deliveredQty','installedQty','unitCostUsd'].includes(sortKey) ? Number(b[sortKey]||0) : (b[sortKey]||'');
    return va < vb ? -sortDir : va > vb ? sortDir : 0;
  });

  const SECTIONS = [
    { key: 'stock',    label: 'Stock Overview' },
    { key: 'delivery', label: 'Delivery Tracker' },
    { key: 'zone',     label: 'Zone Readiness' },
    { key: 'analytics',label: 'Analytics' },
  ];

  const CAT_COLORS = ['#3BB2A5','#2563EB','#7C3AED','#D97706','#EF4444','#059669','#0891B2','#9333EA','#F59E0B','#10B981'];

  return (
    <div className="space-y-5">

      {/* ── KPI Cards 2×4 ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div key={k.label}
            className={`bg-white rounded-xl border p-4 ${k.alert ? 'border-red-100 bg-red-50/20' : 'border-gray-100'}`}>
            <div className="flex items-start justify-between mb-3">
              <p className="text-[11px] text-[#9CA3AF] font-medium leading-tight">{k.label}</p>
              {k.alert && <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-0.5 shrink-0" />}
            </div>
            <p className="text-[22px] font-black leading-none mb-1" style={{ color: k.color }}>{k.value}</p>
            <p className="text-[10px] text-[#C4C9D4] font-medium">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Section navigator + filters ─────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3 flex-wrap">
        {/* Filter selects */}
        <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-[#374151] bg-white focus:outline-none focus:border-[#3BB2A5]">
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterZone} onChange={(e) => setFilterZone(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-[#374151] bg-white focus:outline-none focus:border-[#3BB2A5]">
          <option value="">All Zones</option>
          {zones.map((z) => <option key={z} value={z}>{z}</option>)}
        </select>
        {(filterCat || filterZone) && (
          <button onClick={() => { setFilterCat(''); setFilterZone(''); }}
            className="text-xs text-[#9CA3AF] hover:text-red-500 font-medium px-2 py-1.5 transition-colors">
            Clear filters
          </button>
        )}
        {/* Section tabs */}
        <div className="ml-auto flex items-center rounded-lg border border-gray-200 overflow-hidden bg-white">
          {SECTIONS.map(({ key, label }) => (
            <button key={key} onClick={() => setActiveSection(key)}
              className={`px-4 py-1.5 text-xs font-medium transition-colors border-r border-gray-200 last:border-r-0 ${
                activeSection === key ? 'bg-[#F0FDFB] text-[#3BB2A5] font-semibold' : 'text-[#6B7280] hover:bg-gray-50'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ══ A: STOCK OVERVIEW TABLE ══ */}
      {activeSection === 'stock' && (
        <div className="flex gap-4 items-start">
          {/* Table */}
          <div className="flex-1 min-w-0 rounded-xl border border-gray-100 overflow-hidden bg-white">
            <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-[#111827]">Material Stock Overview</h4>
              <span className="text-xs text-[#9CA3AF]">{filtered.length} of {data.length} items</span>
            </div>
            <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 500 }}>
              <table className="w-full text-sm">
                <thead className="bg-gray-50/80 border-b border-gray-100 sticky top-0 z-10">
                  <tr>
                    {[
                      { k: 'materialName', l: 'Material' },
                      { k: 'category',     l: 'Category' },
                      { k: 'zone',         l: 'Zone' },
                      { k: 'boqQty',       l: 'Required', r: true },
                      { k: 'deliveredQty', l: 'Delivered', r: true },
                      { k: 'installedQty', l: 'Installed', r: true },
                      { k: '_stock',       l: 'Stock', r: true },
                      { k: '_usage',       l: 'Usage %', r: true },
                      { k: '_stockStatus', l: 'Status' },
                      { k: 'linkedMilestone', l: 'Milestone' },
                    ].map(({ k, l, r }) => (
                      <th key={k} onClick={() => handleSort(k)}
                        className={`${r ? 'text-right' : 'text-left'} px-4 py-3 text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider cursor-pointer select-none hover:text-[#374151] whitespace-nowrap`}>
                        {l}{sortArrow(k)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sortRows(filtered).map((m, i) => {
                    const stock  = Math.max(0, Number(m.deliveredQty || 0) - Number(m.installedQty || 0));
                    const boq    = Number(m.boqQty || 0);
                    const inst   = Number(m.installedQty || 0);
                    const usagePct = boq > 0 ? Math.min(Math.round((inst / boq) * 100), 100) : 0;
                    const ss     = getStockStatus(m);
                    const msRisk = m.milestoneDate && m.expectedDelivery && new Date(m.expectedDelivery) > new Date(m.milestoneDate);
                    return (
                      <tr key={m._id || i} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-xs font-semibold text-[#111827]">{m.materialName || '—'}</p>
                          <p className="text-[10px] text-[#9CA3AF]">{m.unit || ''}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-[#374151]">{m.category || '—'}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-[#6B7280]">{m.zone || '—'}</td>
                        <td className="px-4 py-3 text-xs text-right font-medium text-[#374151]">{boq.toLocaleString()}</td>
                        <td className="px-4 py-3 text-xs text-right font-medium text-[#374151]">{Number(m.deliveredQty||0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-xs text-right font-medium text-[#374151]">{Number(m.installedQty||0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-xs text-right font-bold text-[#111827]">{stock.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 justify-end">
                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full"
                                style={{ width: `${usagePct}%`, backgroundColor: usagePct >= 90 ? '#059669' : usagePct >= 50 ? '#3BB2A5' : '#D97706' }} />
                            </div>
                            <span className="text-[10px] font-semibold text-[#374151] w-7 text-right">{usagePct}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <MatStockBadge level={ss} />
                        </td>
                        <td className="px-4 py-3">
                          {m.linkedMilestone ? (
                            <div className="flex items-center gap-1">
                              {msRisk && <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" title="Delivery after milestone" />}
                              <span className="text-[10px] text-[#374151]">{m.linkedMilestone}</span>
                            </div>
                          ) : <span className="text-[10px] text-[#D1D5DB]">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Insights sidebar */}
          {(() => {
            const SEV = {
              critical: { dot: '#DC2626', badgeCls: 'bg-red-50 text-red-700 border border-red-200', border: '#DC2626' },
              high:     { dot: '#D97706', badgeCls: 'bg-amber-50 text-amber-700 border border-amber-200', border: '#D97706' },
              medium:   { dot: '#2563EB', badgeCls: 'bg-blue-50 text-blue-700 border border-blue-200', border: '#2563EB' },
            };
            const alerts = [];

            // 1. Critical low stock
            criticalItems.filter((m) => !filterCat || m.category === filterCat).forEach((m) => {
              const stock = Math.max(0, Number(m.deliveredQty||0) - Number(m.installedQty||0));
              alerts.push({
                id: `crit-${m._id}`, severity: 'critical', category: 'Material Shortage',
                title: `Critical stock: ${m.materialName}`,
                detail: `${stock.toLocaleString()} ${m.unit} remaining${m.reorderLevel ? ` (reorder at ${m.reorderLevel})` : ''}. Zone: ${m.zone || 'Unspecified'}.`,
                action: m.linkedMilestone
                  ? `Milestone "${m.linkedMilestone}" at risk. Reorder immediately.`
                  : 'Reorder immediately to avoid delays.',
              });
            });

            // 2. Delayed deliveries
            delayedItems.filter((m) => !filterCat || m.category === filterCat).forEach((m) => {
              const exp = m.expectedDelivery ? new Date(m.expectedDelivery) : null;
              const delayDays = exp ? Math.max(0, Math.round((Date.now() - exp.getTime()) / 86400000)) : 0;
              alerts.push({
                id: `del-${m._id}`, severity: 'high', category: 'Delayed Delivery',
                title: `${m.materialName} — delayed`,
                detail: `${m.supplier || 'Unknown supplier'}${delayDays > 0 ? `. ${delayDays}d overdue` : ''}. Zone: ${m.zone || '—'}.`,
                action: m.linkedMilestone
                  ? `"${m.linkedMilestone}" affected. Source alternate supplier.`
                  : 'Contact supplier and update schedule.',
              });
            });

            // 3. Over-stock (>125% of BOQ)
            data.filter((m) => (!filterCat || m.category === filterCat) && Number(m.boqQty) > 0 && Number(m.deliveredQty) > Number(m.boqQty) * 1.25).forEach((m) => {
              const excess = Math.round(((Number(m.deliveredQty) - Number(m.boqQty)) / Number(m.boqQty)) * 100);
              alerts.push({
                id: `over-${m._id}`, severity: 'medium', category: 'Over-Stock',
                title: `${m.materialName} — ${excess}% above BOQ`,
                detail: `Delivered ${Number(m.deliveredQty).toLocaleString()} vs required ${Number(m.boqQty).toLocaleString()} ${m.unit}.`,
                action: 'Review usage logs and confirm design changes vs BOQ.',
              });
            });

            // 4. Zone not ready (milestone <14 days, materials still ordered/in-transit)
            zones.filter((z) => !filterZone || z === filterZone).forEach((z) => {
              const zSoon = data.filter((m) => m.zone === z
                && ['ordered','in transit'].includes((m.deliveryStatus||'').toLowerCase())
                && m.milestoneDate
                && (new Date(m.milestoneDate) - today) / 86400000 <= 14
                && (new Date(m.milestoneDate) - today) / 86400000 >= 0);
              if (zSoon.length > 0) {
                alerts.push({
                  id: `zone-${z}`, severity: 'high', category: 'Zone Not Ready',
                  title: `${z} — ${zSoon.length} item${zSoon.length !== 1 ? 's' : ''} not on site`,
                  detail: `${zSoon.map((m) => m.materialName).slice(0, 2).join(', ')}${zSoon.length > 2 ? ` +${zSoon.length - 2} more` : ''} — milestone within 14 days.`,
                  action: 'Expedite deliveries before milestone date.',
                });
              }
            });

            // 5. Milestone delivery risk
            milestonerisk.filter((m) => !filterCat || m.category === filterCat).forEach((m) => {
              const daysLate = Math.round((new Date(m.expectedDelivery) - new Date(m.milestoneDate)) / 86400000);
              alerts.push({
                id: `msrisk-${m._id}`, severity: 'critical', category: 'Milestone Risk',
                title: `${m.materialName} — late delivery`,
                detail: `Expected ${fmtD(m.expectedDelivery)}, milestone ${fmtD(m.milestoneDate)} (${daysLate}d late).`,
                action: 'Fast-track or negotiate partial delivery.',
              });
            });

            const critCount = alerts.filter((a) => a.severity === 'critical').length;
            const highCount = alerts.filter((a) => a.severity === 'high').length;

            return (
              <div className="w-72 shrink-0 flex flex-col gap-3" style={{ maxHeight: 556 }}>
                {/* Panel header — never scrolls */}
                <div className="flex items-center justify-between px-1 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#111827]">Insights</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-[#6B7280] border border-gray-200">
                      {alerts.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {critCount > 0 && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">{critCount} Critical</span>
                    )}
                    {highCount > 0 && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">{highCount} High</span>
                    )}
                  </div>
                </div>

                {alerts.length === 0 ? (
                  <div className="bg-white rounded-xl border border-gray-100 px-4 py-6 flex flex-col items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M3 8l3.5 3.5 6.5-7" stroke="#059669" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <p className="text-xs font-semibold text-[#059669]">All clear</p>
                    <p className="text-[10px] text-[#9CA3AF] text-center">No material issues detected</p>
                  </div>
                ) : (
                  <div className="overflow-y-auto pr-0.5">
                    <div className="flex flex-col gap-2.5">
                    {alerts.map((ins) => {
                      const s = SEV[ins.severity] || SEV.medium;
                      return (
                        <div key={ins.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                          <div className="h-0.5 w-full" style={{ backgroundColor: s.border }} />
                          <div className="px-3.5 py-3">
                            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${s.badgeCls}`}>
                                {ins.severity.charAt(0).toUpperCase() + ins.severity.slice(1)}
                              </span>
                              <span className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider">{ins.category}</span>
                            </div>
                            <p className="text-[11px] font-semibold text-[#111827] leading-snug mb-1">{ins.title}</p>
                            <p className="text-[10px] text-[#6B7280] leading-relaxed mb-1.5">{ins.detail}</p>
                            <p className="text-[10px] text-[#3BB2A5] font-medium">→ {ins.action}</p>
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* ══ B: DELIVERY & PROCUREMENT TRACKER ══ */}
      {activeSection === 'delivery' && (
        <div className="rounded-xl border border-gray-100 overflow-hidden bg-white">
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-[#111827]">Delivery & Procurement Tracker</h4>
            <div className="flex items-center gap-2">
              {delayedItems.length > 0 && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">{delayedItems.length} delayed</span>
              )}
              <span className="text-xs text-[#9CA3AF]">{filtered.length} items</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/80 border-b border-gray-100">
                <tr>
                  {['Material','Category','PO Number','Supplier','Expected','Actual','Delay','Zone Impacted','Status'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sortRows(filtered).map((m, i) => {
                  const ds      = (m.deliveryStatus || '').toLowerCase();
                  const exp     = m.expectedDelivery ? new Date(m.expectedDelivery) : null;
                  const act     = m.actualDelivery   ? new Date(m.actualDelivery)   : null;
                  const refDate = act || new Date();
                  const delayDays = exp && ds !== 'delivered'
                    ? Math.max(0, Math.round((refDate - exp) / 86400000))
                    : act && exp
                    ? Math.max(0, Math.round((act - exp) / 86400000))
                    : 0;
                  const msRisk  = m.milestoneDate && exp && exp > new Date(m.milestoneDate);
                  return (
                    <tr key={m._id || i} className={`hover:bg-gray-50/60 transition-colors ${ds === 'delayed' ? 'bg-red-50/10' : ''}`}>
                      <td className="px-4 py-3">
                        <p className="text-xs font-semibold text-[#111827]">{m.materialName || '—'}</p>
                        {msRisk && <p className="text-[9px] text-red-500 font-medium">⚠ Delivery after milestone</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-[#374151]">{m.category || '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#6B7280] font-mono">{m.poNumber || '—'}</td>
                      <td className="px-4 py-3 text-xs text-[#374151]">{m.supplier || '—'}</td>
                      <td className="px-4 py-3 text-xs text-[#6B7280] whitespace-nowrap">{fmtD(m.expectedDelivery)}</td>
                      <td className="px-4 py-3 text-xs text-[#6B7280] whitespace-nowrap">{fmtD(m.actualDelivery)}</td>
                      <td className="px-4 py-3">
                        {delayDays > 0
                          ? <span className="text-[10px] font-bold text-red-600">+{delayDays}d</span>
                          : <span className="text-[10px] text-[#9CA3AF]">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#6B7280]">{m.zone || '—'}</td>
                      <td className="px-4 py-3"><MatDsBadge status={m.deliveryStatus} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══ C: ZONE MATERIAL READINESS ══ */}
      {activeSection === 'zone' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {(filterZone ? [filterZone] : zones).map((zone) => {
            const zMat  = data.filter((m) => m.zone === zone);
            if (!zMat.length) return null;
            const ready    = zMat.filter((m) => getStockStatus(m) === 'sufficient').length;
            const readyPct = zMat.length > 0 ? Math.round((ready / zMat.length) * 100) : 0;
            const readyColor = readyPct >= 80 ? '#059669' : readyPct >= 50 ? '#D97706' : '#DC2626';

            return (
              <div key={zone} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                {/* Zone header */}
                <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between"
                  style={{ borderLeft: `3px solid ${readyColor}` }}>
                  <div>
                    <h5 className="text-sm font-bold text-[#111827]">{zone}</h5>
                    <p className="text-[11px] text-[#9CA3AF]">{zMat.length} material line{zMat.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-lg font-black leading-none" style={{ color: readyColor }}>{readyPct}%</p>
                      <p className="text-[9px] text-[#9CA3AF]">Readiness</p>
                    </div>
                    <div className="w-10 h-10">
                      <svg viewBox="0 0 36 36" className="-rotate-90 w-full h-full">
                        <circle cx="18" cy="18" r="14" fill="none" stroke="#F3F4F6" strokeWidth="4" />
                        <circle cx="18" cy="18" r="14" fill="none"
                          stroke={readyColor} strokeWidth="4"
                          strokeDasharray={`${readyPct * 0.879} 87.9`} strokeLinecap="round" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Material list */}
                <div className="divide-y divide-gray-50">
                  {zMat.map((m, i) => {
                    const ss = getStockStatus(m);
                    const stock = Math.max(0, Number(m.deliveredQty || 0) - Number(m.installedQty || 0));
                    return (
                      <div key={i} className="px-5 py-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-medium text-[#111827] truncate">{m.materialName}</p>
                            <MatStockBadge level={ss} />
                          </div>
                          <p className="text-[10px] text-[#9CA3AF]">{m.category} · {stock.toLocaleString()} {m.unit} on site</p>
                        </div>
                        <div className="text-right shrink-0">
                          <MatDsBadge status={m.deliveryStatus} />
                          {m.linkedMilestone && (
                            <p className="text-[9px] text-[#9CA3AF] mt-0.5">{m.linkedMilestone}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {zones.length === 0 && (
            <div className="col-span-2 py-12 text-center text-[#9CA3AF] text-xs">No zone data — ensure materials have a Zone column in your CSV.</div>
          )}
        </div>
      )}

      {/* ══ D: ANALYTICS ══ */}
      {activeSection === 'analytics' && (() => {
        // Group by category for bar charts
        const byCat = categories.map((cat) => {
          const rows = filtered.filter((m) => m.category === cat);
          return {
            cat,
            boq:       rows.reduce((s,m) => s + Number(m.boqQty||0), 0),
            delivered: rows.reduce((s,m) => s + Number(m.deliveredQty||0), 0),
            installed: rows.reduce((s,m) => s + Number(m.installedQty||0), 0),
          };
        });
        const maxBar = Math.max(...byCat.flatMap((r) => [r.boq, r.delivered, r.installed]), 1);

        // Donut: distribution by category (by boq value)
        const totalBoqAll = byCat.reduce((s, r) => s + r.boq, 0) || 1;
        let cumAngle = 0;
        const donutSlices = byCat.map((r, i) => {
          const pct = r.boq / totalBoqAll;
          const startAngle = cumAngle;
          cumAngle += pct * 360;
          return { ...r, pct, startAngle, endAngle: cumAngle, color: CAT_COLORS[i % CAT_COLORS.length] };
        });
        const describeArc = (cx, cy, r, startDeg, endDeg) => {
          if (endDeg - startDeg >= 360) endDeg = 359.99;
          const toRad = (d) => (d - 90) * Math.PI / 180;
          const x1 = cx + r * Math.cos(toRad(startDeg));
          const y1 = cy + r * Math.sin(toRad(startDeg));
          const x2 = cx + r * Math.cos(toRad(endDeg));
          const y2 = cy + r * Math.sin(toRad(endDeg));
          const large = endDeg - startDeg > 180 ? 1 : 0;
          return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
        };

        return (
          <div className="space-y-4">

            {/* Grouped bar chart: BOQ vs Delivered vs Installed by Category */}
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h4 className="text-sm font-semibold text-[#111827] mb-1">Quantity by Category</h4>
              <p className="text-[11px] text-[#9CA3AF] mb-4">Required (BOQ) vs Delivered vs Installed</p>
              <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
                {byCat.map(({ cat, boq, delivered, installed }) => (
                  <div key={cat}>
                    <p className="text-xs font-semibold text-[#374151] mb-1.5">{cat}</p>
                    <div className="space-y-1">
                      {[
                        { label: 'BOQ Required', val: boq,       color: '#E5E7EB',  text: '#6B7280' },
                        { label: 'Delivered',     val: delivered, color: '#3BB2A5',  text: '#fff' },
                        { label: 'Installed',     val: installed, color: '#059669',  text: '#fff' },
                      ].map(({ label, val, color, text }) => (
                        <div key={label} className="flex items-center gap-3">
                          <span className="text-[9px] text-[#9CA3AF] w-16 shrink-0 text-right">{label}</span>
                          <div className="flex-1 h-5 bg-gray-100 rounded relative overflow-hidden">
                            <div
                              className="h-full rounded flex items-center justify-end pr-2 transition-all duration-500"
                              style={{ width: `${Math.max((val / maxBar) * 100, 1)}%`, backgroundColor: color, minWidth: val > 0 ? '2%' : '0' }}
                            >
                              {val > 0 && <span className="text-[9px] font-bold" style={{ color: text }}>{val.toLocaleString()}</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {/* Legend */}
              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100">
                {[['BOQ Required','#E5E7EB'],['Delivered','#3BB2A5'],['Installed','#059669']].map(([l,c]) => (
                  <div key={l} className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />
                    <span className="text-[10px] text-[#6B7280]">{l}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Two-col: Stacked progress + Donut */}
            <div className="grid grid-cols-2 gap-4">

              {/* Stacked bar: Installed + Remaining per category */}
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <h4 className="text-sm font-semibold text-[#111827] mb-1">Installation Progress</h4>
                <p className="text-[11px] text-[#9CA3AF] mb-4">Installed vs Remaining per category</p>
                <div className="space-y-3">
                  {byCat.map(({ cat, boq, installed }) => {
                    const instPct  = boq > 0 ? Math.min(Math.round((installed / boq) * 100), 100) : 0;
                    const remPct   = 100 - instPct;
                    return (
                      <div key={cat}>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs font-medium text-[#374151]">{cat}</span>
                          <span className="text-xs font-bold text-[#111827]">{instPct}%</span>
                        </div>
                        <div className="flex h-2 rounded-full overflow-hidden bg-gray-100">
                          <div style={{ width: `${instPct}%`, backgroundColor: '#059669' }} />
                          <div style={{ width: `${remPct}%`, backgroundColor: '#E5E7EB' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Donut: distribution by category */}
              <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col">
                <h4 className="text-sm font-semibold text-[#111827] mb-1">Category Distribution</h4>
                <p className="text-[11px] text-[#9CA3AF] mb-4">By BOQ quantity</p>
                <div className="flex-1 flex flex-col items-center gap-4">
                  <svg viewBox="0 0 100 100" className="w-36 h-36">
                    {donutSlices.map((s, i) => (
                      <path key={i} d={describeArc(50, 50, 40, s.startAngle, s.endAngle)}
                        fill={s.color} opacity="0.9" />
                    ))}
                    <circle cx="50" cy="50" r="24" fill="white" />
                    <text x="50" y="47" textAnchor="middle" fontSize="7" fill="#111827" fontWeight="bold">{categories.length}</text>
                    <text x="50" y="55" textAnchor="middle" fontSize="5.5" fill="#9CA3AF">categories</text>
                  </svg>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 w-full">
                    {donutSlices.map((s) => (
                      <div key={s.cat} className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                        <span className="text-[10px] text-[#374151] truncate">{s.cat}</span>
                        <span className="text-[10px] font-semibold text-[#111827] ml-auto">{Math.round(s.pct * 100)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}


    </div>
  );
}

// ─── Reusable button components ───────────────────────────────────────────────

function UploadBtn({ label, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 rounded-lg border border-[#3BB2A5] bg-[#3BB2A5] px-3 py-2 text-sm font-semibold text-white hover:bg-[#2d9a8e] transition disabled:opacity-50"
    >
      <Upload size={14} />
      {disabled ? 'Uploading…' : label}
    </button>
  );
}

function ClearBtn({ onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 text-sm font-medium text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg border border-red-200 transition"
    >
      <Trash2 size={14} />
      Clear Data
    </button>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAIN_TABS = [
  { key: 'gantt',     label: 'Timeline',          icon: GanttChartSquare },
  { key: 'cost',      label: 'Cost Intelligence',  icon: DollarSign },
  { key: 'resources', label: 'Resources',          icon: Users },
  { key: 'materials', label: 'Materials',          icon: Package },
];

const VIEW_TABS = [
  { key: 'gantt',    label: 'Gantt',    icon: GanttChartSquare },
  { key: 'kanban',   label: 'Kanban',   icon: LayoutGrid },
  { key: 'list',     label: 'List',     icon: List },
  { key: 'calendar', label: 'Calendar', icon: Calendar },
];

// ─── Health card icons ────────────────────────────────────────────────────────

const AheadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <path d="M3 13l4-4 3 3 5-6" stroke="#059669" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const OnTrackIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <circle cx="9" cy="9" r="6.5" stroke="#3BB2A5" strokeWidth="1.75"/>
    <path d="M9 5v4l2.5 1.5" stroke="#3BB2A5" strokeWidth="1.75" strokeLinecap="round"/>
  </svg>
);

const DelayedIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <circle cx="9" cy="9" r="6.5" stroke="#DC2626" strokeWidth="1.75"/>
    <path d="M9 5.5v4" stroke="#DC2626" strokeWidth="1.75" strokeLinecap="round"/>
    <circle cx="9" cy="12" r="0.75" fill="#DC2626"/>
  </svg>
);

// ─── Main component ───────────────────────────────────────────────────────────

export default function TimelineList({ projectId }) {
  const [items, setItems]               = useState([]);
  const [scheduleData, setScheduleData] = useState([]);
  const [costData, setCostData]         = useState([]);
  const [assignmentData, setAssignmentData] = useState([]);
  const [materialData, setMaterialData] = useState([]);

  const [loading, setLoading]         = useState(true);
  const [uploading, setUploading]     = useState(false);
  const [uploadError, setUploadError] = useState('');

  const [activeTab, setActiveTab]       = useState('gantt');
  const [timelineView, setTimelineView] = useState('gantt');
  const [showModal, setShowModal]       = useState(false);
  const [editing, setEditing]           = useState(null);

  const fileInputRef       = useRef(null);
  const costInputRef       = useRef(null);
  const assignmentInputRef = useRef(null);
  const materialInputRef   = useRef(null);
  const { canEdit }        = useRole();

  // ── Data loaders ─────────────────────────────────────────────────────────

  const loadTimeline    = () => timelineApi.list(projectId).then(setItems).catch(() => setItems([]));
  const loadSchedule    = () => scheduleApi.list(projectId).then(setScheduleData).catch(() => setScheduleData([]));
  const loadCosts       = () => costApi.list(projectId).then(setCostData).catch(() => setCostData([]));
  const loadAssignments = () => assignmentApi.list(projectId).then(setAssignmentData).catch(() => setAssignmentData([]));
  const loadMaterials   = () => materialApi.list(projectId).then(setMaterialData).catch(() => setMaterialData([]));

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    Promise.all([loadTimeline(), loadSchedule(), loadCosts(), loadAssignments(), loadMaterials()])
      .finally(() => setLoading(false));
  }, [projectId]);

  // ── CRUD ─────────────────────────────────────────────────────────────────

  const handleSave = async (data) => {
    if (editing) await timelineApi.update(projectId, editing._id, data);
    else         await timelineApi.create(projectId, data);
    setShowModal(false);
    setEditing(null);
    loadTimeline();
  };

  const openAdd = () => { setEditing(null); setShowModal(true); };

  // ── Uploaders ────────────────────────────────────────────────────────────

  const makeUploader = (apiCall, reload) => async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    setUploadError('');
    try { await apiCall(projectId, file); await reload(); }
    catch (err) { setUploadError(err.message || 'Upload failed'); }
    finally { setUploading(false); }
  };

  const handleUpload           = makeUploader(scheduleApi.upload,   loadSchedule);
  const handleUploadCost       = makeUploader(costApi.upload,       loadCosts);
  const handleUploadAssignment = makeUploader(assignmentApi.upload, loadAssignments);
  const handleUploadMaterial   = makeUploader(materialApi.upload,   loadMaterials);

  // ── Clearers ─────────────────────────────────────────────────────────────

  const makeClearer = (apiCall, reset, msg) => async () => {
    if (!window.confirm(msg)) return;
    try { await apiCall(projectId); reset([]); }
    catch (err) { setUploadError(err.message || 'Failed to clear data'); }
  };

  const handleClearSchedule   = makeClearer(scheduleApi.clear,   setScheduleData,   'Clear all schedule data? This cannot be undone.');
  const handleClearCost       = makeClearer(costApi.clear,       setCostData,       'Clear all cost data? This cannot be undone.');
  const handleClearAssignment = makeClearer(assignmentApi.clear, setAssignmentData, 'Clear all assignment data? This cannot be undone.');
  const handleClearMaterial   = makeClearer(materialApi.clear,   setMaterialData,   'Clear all material data? This cannot be undone.');

  if (loading) return <LoadingSpinner />;

  // ── Computed stats ────────────────────────────────────────────────────────
  const total      = scheduleData.length;
  const completed  = scheduleData.filter(t => Number(t.percentComplete ?? t.progress ?? 0) >= 100).length;
  const delayed    = scheduleData.filter(t => {
    const now = Date.now(), end = new Date(t.plannedFinish).getTime(), p = Number(t.percentComplete ?? t.progress ?? 0);
    return !isNaN(end) && now > end && p < 100;
  }).length;
  const inProgress = scheduleData.filter(t => { const p = Number(t.percentComplete ?? t.progress ?? 0); return p > 0 && p < 100; }).length;
  const notStarted = Math.max(0, total - completed - delayed - inProgress);
  const milestones = items.length;
  const avgPct     = total > 0
    ? Math.round(scheduleData.reduce((s, t) => s + Number(t.percentComplete ?? t.progress ?? 0), 0) / total)
    : 0;
  const ahead   = scheduleData.filter(t => {
    const now = Date.now(), end = new Date(t.plannedFinish).getTime(), p = Number(t.percentComplete ?? t.progress ?? 0);
    return p > 0 && p < 100 && !isNaN(end) && now < end;
  }).length;
  const onTrack = Math.max(0, inProgress - ahead);

  const healthCards = [
    {
      key: 'ahead', label: 'AHEAD OF SCHEDULE', count: ahead,
      pct: total > 0 ? Math.round((ahead / total) * 100) : 0,
      desc: 'Progress exceeds expected timeline',
      color: '#059669', barBg: '#D1FAE5',
      Icon: AheadIcon,
    },
    {
      key: 'ontrack', label: 'ON TRACK', count: onTrack,
      pct: total > 0 ? Math.round((onTrack / total) * 100) : 0,
      desc: 'Progressing as planned',
      color: '#3BB2A5', barBg: '#CCFBF1',
      Icon: OnTrackIcon,
    },
    {
      key: 'delayed', label: 'DELAYED', count: delayed,
      pct: total > 0 ? Math.round((delayed / total) * 100) : 0,
      desc: 'Behind schedule or overdue',
      color: '#DC2626', barBg: '#FEE2E2',
      Icon: DelayedIcon,
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>

      {/* ══ ROW 1: Page title (left) + View toggle + Actions (right) ══ */}
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">

        {/* Left: title + subtitle */}
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Project Timeline</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            {total > 0
              ? <>{total} task{total !== 1 ? 's' : ''} · {completed} completed · {milestones} milestone{milestones !== 1 ? 's' : ''}</>
              : 'Track schedules, costs, resources and materials'
            }
          </p>
        </div>

        {/* Right: upload/clear + add task */}
        <div className="flex items-center gap-2 flex-wrap">

          {/* Upload + Clear per tab */}
          {activeTab === 'gantt' && canEdit && (
            <>
              {scheduleData.length > 0 && <ClearBtn onClick={handleClearSchedule} disabled={uploading} />}
              <UploadBtn label="Upload Schedule" onClick={() => fileInputRef.current?.click()} disabled={uploading} />
              <input ref={fileInputRef} type="file" accept=".csv" onChange={handleUpload} className="hidden" />
            </>
          )}
          {activeTab === 'cost' && canEdit && (
            <>
              {costData.length > 0 && <ClearBtn onClick={handleClearCost} disabled={uploading} />}
              <UploadBtn label="Upload Cost" onClick={() => costInputRef.current?.click()} disabled={uploading} />
              <input ref={costInputRef} type="file" accept=".csv" onChange={handleUploadCost} className="hidden" />
            </>
          )}
          {activeTab === 'resources' && canEdit && (
            <>
              {assignmentData.length > 0 && <ClearBtn onClick={handleClearAssignment} disabled={uploading} />}
              <UploadBtn label="Upload Assignments" onClick={() => assignmentInputRef.current?.click()} disabled={uploading} />
              <input ref={assignmentInputRef} type="file" accept=".csv" onChange={handleUploadAssignment} className="hidden" />
            </>
          )}
          {activeTab === 'materials' && canEdit && (
            <>
              {materialData.length > 0 && <ClearBtn onClick={handleClearMaterial} disabled={uploading} />}
              <UploadBtn label="Upload Materials" onClick={() => materialInputRef.current?.click()} disabled={uploading} />
              <input ref={materialInputRef} type="file" accept=".csv" onChange={handleUploadMaterial} className="hidden" />
            </>
          )}

          {/* Add Task */}
          {activeTab === 'gantt' && canEdit && (
            <button
              onClick={openAdd}
              className="flex items-center gap-1.5 rounded-lg bg-[#3BB2A5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2d9a8e] transition"
            >
              <Plus size={14} />+ Add Task
            </button>
          )}
        </div>
      </div>

      {uploadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">{uploadError}</div>
      )}

      {/* ══ ROW 2: Main tab bar — no background, sits on page gray ══ */}
      <div className="border-b border-gray-200 flex overflow-x-auto -mx-6 px-6">
        {MAIN_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'border-[#3BB2A5] text-[#3BB2A5] font-semibold'
                : 'border-transparent text-[#6B7280] hover:text-[#374151]'
            }`}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══ ROW 3: Tab content ══ */}

      {/* ── TIMELINE TAB ── */}
      {activeTab === 'gantt' && (
        <div className="mt-4 space-y-4">

          {/* Stats row — view toggle on the right */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-6 flex-wrap">
              {[
                { dot: '#059669', label: 'Completed',   count: completed },
                { dot: '#3BB2A5', label: 'In Progress', count: inProgress },
                { dot: '#D1D5DB', label: 'Pending',     count: notStarted },
              ].map(({ dot, label, count }) => (
                <span key={label} className="flex items-center gap-2 text-sm text-[#374151]">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: dot }} />
                  <span className="font-medium">{label}</span>
                  <span className="font-bold">{count}</span>
                </span>
              ))}
              <span className="flex items-center gap-1.5 text-sm text-[#374151]">
                <span className="text-amber-400">◆</span>
                <span className="font-medium">Milestones</span>
                <span className="font-bold">{milestones}</span>
              </span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-[#059669]" style={{ width: `${avgPct}%` }} />
                </div>
                <span className="text-sm font-bold text-[#111827] w-9 text-right">{avgPct}%</span>
              </div>
            </div>

            {/* View toggle — right side */}
            <div className="flex items-center rounded-lg border border-gray-200 bg-white overflow-hidden">
              {VIEW_TABS.map((v) => (
                <button
                  key={v.key}
                  onClick={() => setTimelineView(v.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-r border-gray-200 last:border-r-0 ${
                    timelineView === v.key
                      ? 'bg-[#F0FDFB] text-[#3BB2A5] font-semibold'
                      : 'text-[#6B7280] hover:text-[#374151] hover:bg-gray-50'
                  }`}
                >
                  <v.icon size={14} />
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Health cards — 3 separate bordered cards matching Energy Studio */}
          <div className="grid grid-cols-3 gap-4">
            {healthCards.map((card) => (
              <div
                key={card.key}
                className="bg-white rounded-xl border border-gray-200 px-5 py-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <card.Icon />
                    <span className="text-xs font-bold tracking-wide uppercase" style={{ color: card.color }}>
                      {card.label}
                    </span>
                  </div>
                  <span className="text-3xl font-black leading-none" style={{ color: card.color }}>
                    {card.count}
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ backgroundColor: card.barBg }}>
                  <div className="h-full rounded-full" style={{ width: `${card.pct}%`, backgroundColor: card.color }} />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[#6B7280]">{card.desc}</p>
                  <span className="text-xs font-bold" style={{ color: card.color }}>{card.pct}%</span>
                </div>
              </div>
            ))}
          </div>

          {/* View content */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {timelineView === 'gantt'    && <GanttChart data={scheduleData} />}
            {timelineView === 'kanban'   && <TimelineKanban data={scheduleData} />}
            {timelineView === 'list'     && <ScheduleListView data={scheduleData} />}
            {timelineView === 'calendar' && <TimelineCalendar items={items} scheduleData={scheduleData} />}
          </div>
        </div>
      )}

      {/* ── COST / RESOURCES / MATERIALS TABS ── */}
      {activeTab === 'cost'      && <div className="mt-4"><CostView      data={costData}       /></div>}
      {activeTab === 'resources' && <div className="mt-4"><ResourcesView data={assignmentData}  /></div>}
      {activeTab === 'materials' && <div className="mt-4"><MaterialsView data={materialData}    /></div>}

      {/* Task modal */}
      {showModal && (
        <TimelineTaskModal
          initial={editing}
          onSave={handleSave}
          onCancel={() => { setShowModal(false); setEditing(null); }}
        />
      )}
    </div>
  );
}