import { useEffect, useMemo, useState } from 'react';
import {
    ShieldCheck, ShieldOff, ShieldAlert, AlertTriangle,
    Activity, Clock, TrendingUp, TrendingDown, BarChart2,
    Upload, Plus, Trash2, Filter, MoreHorizontal, CheckCircle2,
    ChevronDown, ChevronUp, Zap, Download, FileText,
} from 'lucide-react';
import { hseApi } from '../../../services/api';
import { useRole } from '../../hooks/useRole';
import EmptyState from '../../ui/EmptyState';
import LoadingSpinner from '../../ui/LoadingSpinner';
import HSEForm from './HSEForm';
import HSETrendChart from './HSETrendChart';
import HSESeverityChart from './HSESeverityChart';
import HSEZoneChart from './HSEZoneChart';
import HSEMonthlyChart from './HSEMonthlyChart';

/* ─── helpers ─── */
function daysOpen(dateStr) {
    if (!dateStr) return 0;
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function timeAgo(dateStr) {
    if (!dateStr) return '';
    const days = daysOpen(dateStr);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function pctChange(current, previous) {
    if (previous === 0 && current === 0) return null;
    if (previous === 0) return null;
    return Math.round(((current - previous) / previous) * 100);
}

const SEVERITY_CFG = {
    Critical: {
        dot: 'bg-red-500',
        row: 'border-red-100 bg-red-50/30',
        badge: 'bg-red-50 text-red-700 border-red-200',
        pill: 'bg-red-100 text-red-700',
    },
    Warning: {
        dot: 'bg-amber-500',
        row: 'border-amber-100 bg-amber-50/30',
        badge: 'bg-amber-50 text-amber-700 border-amber-200',
        pill: 'bg-amber-100 text-amber-700',
    },
    Info: {
        dot: 'bg-teal-500',
        row: 'border-teal-100 bg-teal-50/30',
        badge: 'bg-teal-50 text-teal-700 border-teal-200',
        pill: 'bg-teal-100 text-teal-700',
    },
};

/* ─── KPI card ─── */
function KPICard({ label, value, icon: Icon, iconBg, sub, pct, pctGoodWhenDown = true }) {
    const pctUp = pct !== null && pct !== undefined && pct > 0;
    const isGood = pctGoodWhenDown ? !pctUp : pctUp;
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-5 flex items-start gap-4">
            <div className={`w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
                <Icon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-[11px] font-medium text-textsec uppercase tracking-wide">{label}</div>
                <div className="text-2xl font-bold text-textpri mt-0.5 leading-none">{value}</div>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {pct !== null && pct !== undefined ? (
                        <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${
                            isGood ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                        }`}>
                            {pctUp
                                ? <TrendingUp className="w-3 h-3" />
                                : <TrendingDown className="w-3 h-3" />}
                            {pct > 0 ? '+' : ''}{pct}% vs last month
                        </span>
                    ) : sub ? (
                        <span className="text-[11px] text-textsec">{sub}</span>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

/* ─── chart section wrapper ─── */
function SectionCard({ title, subtitle, action, children, className = '' }) {
    return (
        <div className={`bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-5 flex flex-col ${className}`}>
            <div className="flex items-start justify-between mb-4">
                <div>
                    <div className="text-sm font-semibold text-textpri">{title}</div>
                    {subtitle && <div className="text-xs text-textsec mt-0.5">{subtitle}</div>}
                </div>
                {action}
            </div>
            <div className="flex-1 min-h-0">{children}</div>
        </div>
    );
}

/* ─── days open badge ─── */
function DaysOpenBadge({ days }) {
    const cls = days > 30
        ? 'bg-red-50 text-red-700'
        : days > 7
            ? 'bg-amber-50 text-amber-700'
            : 'bg-gray-50 text-textsec';
    return (
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${cls}`}>
            {days}d open
        </span>
    );
}

/* ─── open incidents table ─── */
function OpenIncidentsTable({ items, canEdit, onEdit, onDelete, onViewAll }) {
    const rows = useMemo(() =>
        items
            .filter(i => i.severity === 'Critical' || i.severity === 'Warning')
            .sort((a, b) => {
                const sev = { Critical: 0, Warning: 1, Info: 2 };
                if (sev[a.severity] !== sev[b.severity]) return sev[a.severity] - sev[b.severity];
                return daysOpen(b.date) - daysOpen(a.date);
            })
            .slice(0, 8),
        [items]
    );

    const [menuId, setMenuId] = useState(null);

    if (rows.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-10 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-2" />
                <p className="text-sm font-semibold text-textpri">No open critical or warning incidents</p>
                <p className="text-xs text-textsec mt-0.5">All high-priority issues have been resolved.</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto -mx-1">
            <table className="w-full text-xs min-w-[560px]">
                <thead>
                    <tr className="border-b border-gray-100">
                        {['Incident', 'Zone', 'Severity', 'Days Open', 'Reported'].map(h => (
                            <th key={h} className="text-left px-3 py-2 text-[11px] font-semibold text-textsec uppercase tracking-wide whitespace-nowrap">
                                {h}
                            </th>
                        ))}
                        {canEdit && <th className="px-3 py-2" />}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {rows.map((item) => {
                        const cfg = SEVERITY_CFG[item.severity] || SEVERITY_CFG.Info;
                        const days = daysOpen(item.date);
                        const isOpen = menuId === item._id;
                        return (
                            <tr key={item._id} className="hover:bg-gray-50/60 transition-colors group">
                                <td className="px-3 py-3 max-w-[220px]">
                                    <div className="flex items-center gap-2">
                                        <span className={`block w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                                        <span className="font-medium text-textpri truncate">{item.title}</span>
                                    </div>
                                    {item.description && (
                                        <p className="text-[11px] text-textsec ml-4 mt-0.5 truncate max-w-[180px]">{item.description}</p>
                                    )}
                                </td>
                                <td className="px-3 py-3 whitespace-nowrap">
                                    {item.zoneId && item.zoneId !== ''
                                        ? <span className="bg-gray-100 text-textsec px-2 py-0.5 rounded text-[11px] font-medium">{item.zoneId}</span>
                                        : <span className="text-gray-300">—</span>
                                    }
                                </td>
                                <td className="px-3 py-3 whitespace-nowrap">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-semibold ${cfg.badge}`}>
                                        {item.severity}
                                    </span>
                                </td>
                                <td className="px-3 py-3 whitespace-nowrap">
                                    <DaysOpenBadge days={days} />
                                </td>
                                <td className="px-3 py-3 whitespace-nowrap text-textsec">
                                    {new Date(item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </td>
                                {canEdit && (
                                    <td className="px-3 py-3 text-right relative whitespace-nowrap">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setMenuId(isOpen ? null : item._id); }}
                                            className="p-1.5 rounded-lg text-textsec hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <MoreHorizontal className="w-3.5 h-3.5" />
                                        </button>
                                        {isOpen && (
                                            <div className="absolute right-2 top-9 w-32 bg-white border border-gray-100 rounded-xl shadow-lg z-30 py-1 text-xs">
                                                <button
                                                    className="w-full text-left px-3 py-2 hover:bg-gray-50 text-textpri"
                                                    onClick={(e) => { e.stopPropagation(); onEdit(item); setMenuId(null); }}
                                                >Edit</button>
                                                <button
                                                    className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-600"
                                                    onClick={(e) => { e.stopPropagation(); onDelete(item._id); setMenuId(null); }}
                                                >Delete</button>
                                            </div>
                                        )}
                                    </td>
                                )}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            {items.filter(i => i.severity === 'Critical' || i.severity === 'Warning').length > 8 && (
                <div className="pt-3 border-t border-gray-50 mt-2">
                    <button onClick={onViewAll} className="text-xs text-brand font-medium hover:underline">
                        View all {items.filter(i => i.severity === 'Critical' || i.severity === 'Warning').length} critical & warning incidents →
                    </button>
                </div>
            )}
        </div>
    );
}

/* ─── incident row (incidents tab) ─── */
function IncidentRow({ item, canEdit, onEdit, onDelete, openMenuId, setOpenMenuId }) {
    const cfg = SEVERITY_CFG[item.severity] || SEVERITY_CFG.Info;
    const isOpen = openMenuId === item._id;
    return (
        <div
            className={`flex items-start gap-3 rounded-xl border p-4 transition-shadow hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] ${cfg.row}`}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="mt-1 shrink-0">
                <span className={`block w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-semibold ${cfg.badge}`}>
                        {item.severity}
                    </span>
                    <span className="text-sm font-semibold text-textpri truncate">{item.title}</span>
                </div>
                {item.description && (
                    <p className="text-xs text-textsec mt-0.5 line-clamp-1">{item.description}</p>
                )}
                <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[11px] text-textsec flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {timeAgo(item.date)}
                    </span>
                    {item.zoneId && item.zoneId !== '' && (
                        <span className="text-[11px] text-textsec bg-gray-100 px-1.5 py-0.5 rounded">{item.zoneId}</span>
                    )}
                    <DaysOpenBadge days={daysOpen(item.date)} />
                </div>
            </div>
            {canEdit && (
                <div className="relative shrink-0">
                    <button
                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(isOpen ? null : item._id); }}
                        className="p-1.5 rounded-lg text-textsec hover:bg-white hover:text-textpri transition-colors"
                    >
                        <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {isOpen && (
                        <div className="absolute right-0 top-8 w-36 bg-white border border-gray-100 rounded-xl shadow-lg z-20 py-1 text-xs">
                            <button
                                className="w-full text-left px-3 py-2 hover:bg-gray-50 text-textpri"
                                onClick={(e) => { e.stopPropagation(); onEdit(item); setOpenMenuId(null); }}
                            >Edit</button>
                            <button
                                className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-600"
                                onClick={(e) => { e.stopPropagation(); onDelete(item._id); setOpenMenuId(null); }}
                            >Delete</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/* ─── historical comparison table ─── */
const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function HistoricalTable({ items }) {
    const rows = useMemo(() => {
        const map = {};
        (items || []).forEach(item => {
            const d = new Date(item.date);
            const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2,'0')}`;
            const label = `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`;
            if (!map[key]) map[key] = { key, label, Critical: 0, Warning: 0, Info: 0, total: 0 };
            map[key][item.severity] = (map[key][item.severity] || 0) + 1;
            map[key].total += 1;
        });
        return Object.values(map).sort((a, b) => b.key.localeCompare(a.key)).slice(0, 12);
    }, [items]);

    if (!rows.length) return <p className="text-xs text-textsec py-2">No historical data available.</p>;

    return (
        <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-xs min-w-[400px]">
                <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                        {['Month', 'Critical', 'Warning', 'Info', 'Total'].map(h => (
                            <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold text-textsec uppercase tracking-wide">{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {rows.map((row, i) => (
                        <tr key={row.key} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}>
                            <td className="px-4 py-2.5 font-medium text-textpri">{row.label}</td>
                            <td className="px-4 py-2.5">
                                {row.Critical > 0
                                    ? <span className="font-semibold text-red-600">{row.Critical}</span>
                                    : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-4 py-2.5">
                                {row.Warning > 0
                                    ? <span className="font-semibold text-amber-600">{row.Warning}</span>
                                    : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-4 py-2.5">
                                {row.Info > 0
                                    ? <span className="font-semibold text-teal-600">{row.Info}</span>
                                    : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-4 py-2.5 font-bold text-textpri">{row.total}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/* ════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════ */
export default function HSEList({ projectId }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [filterSeverity, setFilterSeverity] = useState('All');
    const [openMenuId, setOpenMenuId] = useState(null);
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const { canEdit } = useRole();

    const load = () => {
        setLoading(true);
        hseApi.list(projectId)
            .then(setItems)
            .catch(() => setItems([]))
            .finally(() => setLoading(false));
    };

    useEffect(() => { if (projectId) load(); }, [projectId]);
    useEffect(() => {
        const close = () => setOpenMenuId(null);
        window.addEventListener('click', close);
        return () => window.removeEventListener('click', close);
    }, []);

    const handleSave = async (data) => {
        if (editing) await hseApi.update(projectId, editing._id, data);
        else await hseApi.create(projectId, data);
        setShowForm(false);
        setEditing(null);
        load();
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this incident?')) return;
        await hseApi.remove(projectId, id);
        load();
    };

    const handleClear = async () => {
        if (!window.confirm('Clear ALL HSE data for this project? This cannot be undone.')) return;
        try { await hseApi.clear(projectId); setItems([]); }
        catch (err) { alert(err.message || 'Failed to clear data'); }
    };

    /* ── KPI computation ── */
    const kpi = useMemo(() => {
        const now = new Date();
        const total = items.length;
        const critical = items.filter(i => i.severity === 'Critical').length;
        const thisMonth = items.filter(i => {
            const d = new Date(i.date);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).length;
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonth = items.filter(i => {
            const d = new Date(i.date);
            return d.getMonth() === lastMonthDate.getMonth() && d.getFullYear() === lastMonthDate.getFullYear();
        }).length;
        const ltir = total > 0
            ? ((critical * 200000) / Math.max(total * 1000, 1)).toFixed(2)
            : '0.00';
        const pct = pctChange(thisMonth, lastMonth);
        // last 7 days new
        const newThisWeek = items.filter(i => daysOpen(i.date) <= 7).length;
        return { total, critical, thisMonth, lastMonth, ltir, pct, newThisWeek };
    }, [items]);

    /* ── filtered incidents list ── */
    const filtered = useMemo(() => {
        const list = filterSeverity === 'All' ? items : items.filter(i => i.severity === filterSeverity);
        return [...list].sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [items, filterSeverity]);

    const tabs = [
        { key: 'overview',  label: 'Overview',               icon: BarChart2 },
        { key: 'incidents', label: `All Incidents (${items.length})`, icon: AlertTriangle },
    ];

    if (loading) return <LoadingSpinner />;

    return (
        <div className="space-y-6" onClick={() => setOpenMenuId(null)}>

            {/* ════ PAGE HEADER ════ */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-xl font-bold text-textpri flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-brand" />
                        HSE Management
                    </h1>
                    <p className="text-sm text-textsec mt-0.5">
                        Health, Safety & Environment — Incident Intelligence
                    </p>
                </div>
                {canEdit && (
                    <div className="flex items-center gap-2 flex-wrap">
                        {items.length > 0 && (
                            <button
                                onClick={(e) => { e.stopPropagation(); handleClear(); }}
                                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-xl border border-red-100 transition-colors"
                            >
                                <Trash2 className="w-3.5 h-3.5" /> Clear All
                            </button>
                        )}
                        <label className="flex items-center gap-1.5 cursor-pointer px-3 py-2 text-xs font-medium text-textsec bg-white hover:bg-gray-50 rounded-xl border border-gray-200 transition-colors">
                            <Upload className="w-3.5 h-3.5" /> Import CSV
                            <input
                                type="file" accept=".csv" className="hidden"
                                onChange={async (e) => {
                                    if (!e.target.files?.[0]) return;
                                    try {
                                        setLoading(true);
                                        const res = await hseApi.importCsv(projectId, e.target.files[0]);
                                        alert(`Imported ${res.importedCount} incidents successfully.`);
                                        load();
                                    } catch (err) {
                                        alert('Import failed: ' + err.message);
                                        setLoading(false);
                                    }
                                    e.target.value = '';
                                }}
                            />
                        </label>
                        <button
                            onClick={(e) => { e.stopPropagation(); setEditing(null); setShowForm(true); }}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-brand hover:bg-brand-600 rounded-xl transition-colors shadow-sm"
                        >
                            <Plus className="w-3.5 h-3.5" /> Report Incident
                        </button>
                    </div>
                )}
            </div>

            {/* inline form */}
            {showForm && (
                <div onClick={(e) => e.stopPropagation()}>
                    <HSEForm
                        initial={editing}
                        onSave={handleSave}
                        onCancel={() => { setShowForm(false); setEditing(null); }}
                    />
                </div>
            )}

            {/* ════ LAYER 1 — EXECUTIVE KPI ROW (5 cards) ════ */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <KPICard
                    label="Total Incidents"
                    value={kpi.total}
                    icon={Activity}
                    iconBg="bg-gradient-to-br from-slate-500 to-slate-700"
                    sub="All recorded"
                />
                <KPICard
                    label="Critical Open"
                    value={kpi.critical}
                    icon={ShieldOff}
                    iconBg={kpi.critical > 0
                        ? 'bg-gradient-to-br from-red-500 to-rose-600'
                        : 'bg-gradient-to-br from-emerald-500 to-teal-600'}
                    sub={kpi.critical > 0 ? 'Requires immediate action' : 'All clear'}
                />
                <KPICard
                    label="This Month"
                    value={kpi.thisMonth}
                    icon={Clock}
                    iconBg="bg-gradient-to-br from-blue-500 to-indigo-600"
                    pct={kpi.pct}
                    pctGoodWhenDown={true}
                    sub={kpi.pct === null ? `${kpi.lastMonth} last month` : undefined}
                />
                <KPICard
                    label="LTIR"
                    value={kpi.ltir}
                    icon={CheckCircle2}
                    iconBg="bg-gradient-to-br from-violet-500 to-purple-600"
                    sub="Lost Time Injury Rate"
                />
                <KPICard
                    label="New This Week"
                    value={kpi.newThisWeek}
                    icon={Zap}
                    iconBg={kpi.newThisWeek > 0
                        ? 'bg-gradient-to-br from-amber-500 to-orange-500'
                        : 'bg-gradient-to-br from-emerald-500 to-teal-600'}
                    sub="Last 7 days"
                />
            </div>

            {/* ── tabs ── */}
            <div className="flex items-center gap-1 border-b border-gray-100">
                {tabs.map(({ key, label, icon: Icon }) => (
                    <button
                        key={key}
                        onClick={(e) => { e.stopPropagation(); setActiveTab(key); }}
                        className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                            activeTab === key
                                ? 'border-brand text-brand'
                                : 'border-transparent text-textsec hover:text-textpri'
                        }`}
                    >
                        <Icon className="w-4 h-4" />
                        {label}
                    </button>
                ))}
            </div>

            {/* ════ OVERVIEW TAB ════ */}
            {activeTab === 'overview' && (
                <div className="space-y-5">
                    {items.length === 0 ? (
                        <EmptyState
                            title="No HSE data yet"
                            description="Report incidents or import a CSV to see analytics."
                        />
                    ) : (
                        <>
                            {/* ── LAYER 2: Primary Trend — hero full-width chart ── */}
                            <SectionCard
                                title="Incident Trend"
                                subtitle="Monthly incident volume by severity — identify patterns and escalations"
                            >
                                <div className="h-64">
                                    <HSETrendChart items={items} />
                                </div>
                            </SectionCard>

                            {/* ── LAYER 3: Risk & Distribution — 2-column ── */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                <SectionCard
                                    title="Severity Distribution"
                                    subtitle="What types of incidents are occurring?"
                                >
                                    <div className="h-52">
                                        <HSESeverityChart items={items} />
                                    </div>
                                </SectionCard>
                                <SectionCard
                                    title="Incidents by Zone"
                                    subtitle="Where are incidents happening?"
                                >
                                    <div className="h-52">
                                        <HSEZoneChart items={items} />
                                    </div>
                                </SectionCard>
                            </div>

                            {/* ── LAYER 4: Operational Action — open incidents table ── */}
                            <SectionCard
                                title="Open Critical & Warning Incidents"
                                subtitle="Prioritised by severity and days open — take action"
                                action={
                                    <button
                                        onClick={() => setActiveTab('incidents')}
                                        className="text-xs text-brand font-medium hover:underline shrink-0"
                                    >
                                        View all incidents →
                                    </button>
                                }
                            >
                                <OpenIncidentsTable
                                    items={items}
                                    canEdit={canEdit}
                                    onEdit={(i) => { setEditing(i); setShowForm(true); }}
                                    onDelete={handleDelete}
                                    onViewAll={() => setActiveTab('incidents')}
                                />
                            </SectionCard>

                            {/* ── LAYER 5: Advanced Analytics (collapsible) ── */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
                                {/* accordion header */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); setAdvancedOpen(v => !v); }}
                                    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50/50 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <BarChart2 className="w-4 h-4 text-textsec" />
                                        <span className="text-sm font-semibold text-textpri">Advanced Analytics</span>
                                        <span className="text-[11px] text-textsec bg-gray-100 px-2 py-0.5 rounded-full">
                                            Monthly volume · Historical comparison · Export
                                        </span>
                                    </div>
                                    {advancedOpen
                                        ? <ChevronUp className="w-4 h-4 text-textsec shrink-0" />
                                        : <ChevronDown className="w-4 h-4 text-textsec shrink-0" />}
                                </button>

                                {advancedOpen && (
                                    <div className="border-t border-gray-50">

                                        {/* ── export toolbar ── */}
                                        <div className="flex items-center justify-between px-5 py-3 bg-gray-50/50 border-b border-gray-100">
                                            <span className="text-xs font-semibold text-textsec uppercase tracking-wide">Data Export</span>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const headers = ['Title', 'Severity', 'Zone', 'Date', 'Description'];
                                                        const rows = items.map(i => [
                                                            `"${(i.title || '').replace(/"/g, '""')}"`,
                                                            i.severity || '',
                                                            i.zoneId || '',
                                                            i.date ? new Date(i.date).toLocaleDateString('en-GB') : '',
                                                            `"${(i.description || '').replace(/"/g, '""')}"`,
                                                        ].join(','));
                                                        const csv = [headers.join(','), ...rows].join('\n');
                                                        const blob = new Blob([csv], { type: 'text/csv' });
                                                        const url = URL.createObjectURL(blob);
                                                        const a = document.createElement('a');
                                                        a.href = url;
                                                        a.download = `hse-incidents-${new Date().toISOString().slice(0, 10)}.csv`;
                                                        a.click();
                                                        URL.revokeObjectURL(url);
                                                    }}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-textsec bg-white hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
                                                >
                                                    <Download className="w-3.5 h-3.5" /> Export CSV
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const lines = [
                                                            `HSE Incident Report`,
                                                            `Generated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`,
                                                            ``,
                                                            `SUMMARY`,
                                                            `Total Incidents : ${items.length}`,
                                                            `Critical        : ${items.filter(i => i.severity === 'Critical').length}`,
                                                            `Warning         : ${items.filter(i => i.severity === 'Warning').length}`,
                                                            `Info            : ${items.filter(i => i.severity === 'Info').length}`,
                                                            ``,
                                                            `INCIDENT LOG`,
                                                            ...items
                                                                .sort((a, b) => new Date(b.date) - new Date(a.date))
                                                                .map(i =>
                                                                    `[${i.severity}] ${new Date(i.date).toLocaleDateString('en-GB')} — ${i.title}${i.zoneId ? ` (${i.zoneId})` : ''}${i.description ? `\n  ${i.description}` : ''}`
                                                                ),
                                                        ];
                                                        const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
                                                        const url = URL.createObjectURL(blob);
                                                        const a = document.createElement('a');
                                                        a.href = url;
                                                        a.download = `hse-report-${new Date().toISOString().slice(0, 10)}.txt`;
                                                        a.click();
                                                        URL.revokeObjectURL(url);
                                                    }}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-textsec bg-white hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
                                                >
                                                    <FileText className="w-3.5 h-3.5" /> Export Report
                                                </button>
                                            </div>
                                        </div>

                                        <div className="px-5 pb-6 space-y-6 mt-5">

                                            {/* ── monthly stacked volume ── */}
                                            <div>
                                                <div className="text-xs font-semibold text-textsec uppercase tracking-wide mb-1">Monthly Incident Volume</div>
                                                <div className="text-xs text-textsec mb-3">Stacked count per month by severity</div>
                                                <div className="h-52">
                                                    <HSEMonthlyChart items={items} />
                                                </div>
                                            </div>

                                            {/* ── historical comparison table ── */}
                                            <div>
                                                <div className="text-xs font-semibold text-textsec uppercase tracking-wide mb-1">Historical Comparison</div>
                                                <div className="text-xs text-textsec mb-3">Month-by-month breakdown of all severities</div>
                                                <HistoricalTable items={items} />
                                            </div>

                                            {/* ── severity progress bars ── */}
                                            <div>
                                                <div className="text-xs font-semibold text-textsec uppercase tracking-wide mb-3">Severity Proportion</div>
                                                <div className="space-y-2.5">
                                                    {['Critical', 'Warning', 'Info'].map(s => {
                                                        const count = items.filter(i => i.severity === s).length;
                                                        const pct = items.length > 0 ? Math.round((count / items.length) * 100) : 0;
                                                        const barColor = s === 'Critical' ? 'bg-red-500' : s === 'Warning' ? 'bg-amber-500' : 'bg-teal-500';
                                                        const labelColor = s === 'Critical' ? 'text-red-600' : s === 'Warning' ? 'text-amber-600' : 'text-teal-600';
                                                        return (
                                                            <div key={s} className="flex items-center gap-3">
                                                                <span className={`w-14 text-right text-[11px] font-semibold shrink-0 ${labelColor}`}>{s}</span>
                                                                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                                    <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
                                                                </div>
                                                                <span className="text-[11px] text-textsec w-16 text-right shrink-0">{count} ({pct}%)</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ════ INCIDENTS TAB ════ */}
            {activeTab === 'incidents' && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-textsec flex items-center gap-1">
                            <Filter className="w-3.5 h-3.5" /> Filter:
                        </span>
                        {['All', 'Critical', 'Warning', 'Info'].map((s) => (
                            <button
                                key={s}
                                onClick={(e) => { e.stopPropagation(); setFilterSeverity(s); }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border ${
                                    filterSeverity === s
                                        ? s === 'Critical' ? 'bg-red-50 text-red-700 border-red-200'
                                        : s === 'Warning'  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                        : s === 'Info'     ? 'bg-teal-50 text-teal-700 border-teal-200'
                                        : 'bg-brand-50 text-brand border-brand/20'
                                        : 'bg-white text-textsec border-gray-200 hover:bg-gray-50'
                                }`}
                            >
                                {s}
                                {s !== 'All' && (
                                    <span className="ml-1.5 opacity-70">
                                        {items.filter(i => i.severity === s).length}
                                    </span>
                                )}
                            </button>
                        ))}
                        <span className="ml-auto text-xs text-textsec">
                            {filtered.length} record{filtered.length !== 1 ? 's' : ''}
                        </span>
                    </div>

                    {filtered.length === 0 ? (
                        <EmptyState
                            title="No incidents found"
                            description={filterSeverity !== 'All'
                                ? `No ${filterSeverity} incidents recorded.`
                                : 'No HSE incidents recorded yet.'}
                        />
                    ) : (
                        <div className="space-y-2">
                            {filtered.map((item) => (
                                <IncidentRow
                                    key={item._id}
                                    item={item}
                                    canEdit={canEdit}
                                    onEdit={(i) => { setEditing(i); setShowForm(true); }}
                                    onDelete={handleDelete}
                                    openMenuId={openMenuId}
                                    setOpenMenuId={setOpenMenuId}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
