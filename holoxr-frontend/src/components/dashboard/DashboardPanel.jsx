// DashboardPanel.jsx — Light enterprise theme redesign
import { useEffect, useMemo, useState } from 'react';
import { MoreHorizontal, Briefcase, CheckCircle2, Clock, PauseCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import ProfileEdit from '../../pages/ProfilePage';
import ProfileView from '../../pages/ProfileView';
import AnalyticsDashboard from '../analytics/AnalyticsDashboard';
import BillingPricing from '../billing/BillingPricing';
import ShareProjectModal from '../team/ShareProjectModal';

/* ─── helpers ─── */

function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return `${Math.floor(days / 30)}mo ago`;
}

function getProjectStatus(proj) {
    if (proj.status) return proj.status;
    if (proj.deletedAt) return 'Trashed';
    const updated = new Date(proj.updatedAt || proj.createdAt);
    const daysSince = (Date.now() - updated.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince > 60) return 'On Hold';
    if (daysSince > 14) return 'Completed';
    return 'Active';
}

function getProjectProgress(proj) {
    if (typeof proj.progress === 'number') return proj.progress;
    // Derive a mock progress from status
    const status = getProjectStatus(proj);
    if (status === 'Completed') return 100;
    if (status === 'On Hold') return Math.floor(Math.random() * 30 + 20);
    return Math.floor(Math.random() * 50 + 30);
}

const STATUS_STYLES = {
    'Active': { bg: 'bg-emerald-400/10', text: 'text-emerald-500', dot: 'bg-emerald-500' },
    'In Progress': { bg: 'bg-[#2C97D4]/10', text: 'text-[#2C97D4]', dot: 'bg-[#2C97D4]' },
    'Completed': { bg: 'bg-violet-400/10', text: 'text-violet-500', dot: 'bg-violet-500' },
    'On Hold': { bg: 'bg-amber-400/10', text: 'text-amber-500', dot: 'bg-amber-500' },
    'Trashed': { bg: 'bg-error/10', text: 'text-error', dot: 'bg-error' },
};

const PROJECT_COLORS = [
    'bg-gradient-to-br from-teal-400 to-emerald-500',
    'bg-gradient-to-br from-blue-400 to-indigo-500',
    'bg-gradient-to-br from-violet-400 to-purple-500',
    'bg-gradient-to-br from-amber-400 to-orange-500',
    'bg-gradient-to-br from-rose-400 to-pink-500',
    'bg-gradient-to-br from-cyan-400 to-blue-500',
];

/* ─── KPI Card ─── */

function KPICard({ label, value, icon: Icon, iconBg, iconColor, delta, deltaUp }) {
    return (
        <div className="bg-surface p-5 rounded-lg border border-border hover:shadow-card-hover transition-all group">
            {/* Top row: icon left, badge right */}
            <div className="flex items-start justify-between mb-3">
                <div className={`${iconBg} p-2.5 rounded-lg`}>
                    <Icon size={20} className={iconColor} />
                </div>
                {delta !== undefined && (
                    <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${deltaUp ? 'bg-emerald-400/10 text-emerald-500' : 'bg-error/10 text-error'}`}>
                        {deltaUp
                            ? <ArrowUpRight size={12} />
                            : <ArrowDownRight size={12} />}
                        {delta}
                    </span>
                )}
            </div>
            {/* Number + label */}
            <h3 className="text-2xl font-bold text-textpri mb-1" style={{ fontFamily: "'Syne', 'Inter', sans-serif" }}>{value}</h3>
            <p className="text-sm text-textsec">{label}</p>
        </div>
    );
}

/* ─── Project Card ─── */

function ProjectCard({ proj, index, openMenuId, setOpenMenuId, onNavigate, onOpenShare, onDelete }) {
    const status = getProjectStatus(proj);
    const progress = getProjectProgress(proj);
    const styles = STATUS_STYLES[status] || STATUS_STYLES['Active'];
    const colorClass = PROJECT_COLORS[index % PROJECT_COLORS.length];
    const initial = (proj.name || 'P').charAt(0).toUpperCase();


    const isMenuOpen = openMenuId === proj._id;

    return (
        <div
            onClick={() => onNavigate(`/digital-twin?id=${proj._id}`)}
            className={`bg-surface rounded-lg border border-border p-5 pt-4 flex flex-col gap-4 transition-shadow duration-150 hover:shadow-card-hover relative group cursor-pointer ${isMenuOpen ? 'z-20' : 'z-0'}`}
        >
            {/* Thumbnail preview */}
            <div className="w-full h-32 rounded-lg overflow-hidden bg-borderlight">
                {proj.thumbnail ? (
                    <img
                        src={proj.thumbnail}
                        alt={proj.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-texttert text-xs">
                        No preview
                    </div>
                )}
            </div>

            {/* Top row: icon + name + menu */}
            <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg ${colorClass} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                    {initial}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="font-semibold text-textpri text-[15px] truncate" style={{ fontFamily: "'Syne', 'Inter', sans-serif" }}>{proj.name}</div>
                    <div className="text-[14px] text-textsec mt-0.5">Updated {timeAgo(proj.updatedAt)}</div>
                </div>
                {/* Ellipsis menu */}
                <div className="relative">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(isMenuOpen ? null : proj._id);
                        }}
                        className="p-1.5 rounded-lg text-textsec hover:text-textpri hover:bg-borderlight transition-colors opacity-0 group-hover:opacity-100 relative z-30"
                        aria-label="Project menu"
                    >
                        <MoreHorizontal className="w-4 h-4" />
                    </button>

                    {isMenuOpen && (
                        <div
                            className="absolute right-0 top-8 w-48 bg-surface border border-border rounded-lg shadow-card z-50 py-1.5 text-sm"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                className="w-full text-left px-4 py-2 hover:bg-appbg text-textpri"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(`/digital-twin?id=${proj._id}`, '_blank');
                                    setOpenMenuId(null);
                                }}
                            >
                                Open in New Tab
                            </button>
                            <button
                                className="w-full text-left px-4 py-2 hover:bg-appbg text-textpri"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onNavigate(`/studio?id=${proj._id}`);
                                }}
                            >
                                Edit
                            </button>
                            <button
                                className="w-full text-left px-4 py-2 hover:bg-appbg text-textpri"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenShare(proj);
                                }}
                            >
                                Share
                            </button>
                            <hr className="my-1 border-borderlight" />
                            <button
                                className="w-full text-left px-4 py-2 hover:bg-error/10 text-error"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(proj._id);
                                }}
                            >
                                Move to Trash
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Status badge */}
            <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${styles.bg} ${styles.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
                    {status}
                </span>
            </div>

            {/* Progress bar */}
            <div>
                <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-textsec font-medium">Progress</span>
                    <span className="text-xs font-semibold text-textpri">{progress}%</span>
                </div>
                <div className="w-full h-2 bg-borderlight rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-brand to-brandend transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
        </div>
    );
}

/* ─── Main Panel ─── */

export default function DashboardPanel({
    activeView,
    projects,
    sharedProjects,
    trashedProjects,
    openMenuId,
    setOpenMenuId,
    setProjects,
    setTrashedProjects,
    setActiveView,
    onOpenShare,
    userPlan = 'Free',
    planLimits,
}) {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const initialTab = (() => {
        const t = searchParams.get('tab');
        return t === 'trash' ? 'trash' : t === 'shared' ? 'shared' : 'active';
    })();
    const [designsTab, setDesignsTab] = useState(initialTab);

    useEffect(() => {
        const t = searchParams.get('tab');
        const next = t === 'trash' ? 'trash' : t === 'shared' ? 'shared' : 'active';
        if (next !== designsTab) setDesignsTab(next);
    }, [searchParams]);

    useEffect(() => {
        if (activeView === 'trash') {
            navigate('/dashboard/your-designs?tab=trash', { replace: true });
        }
    }, [activeView, navigate]);

    useEffect(() => {
        const close = () => setOpenMenuId(null);
        window.addEventListener('click', close);
        return () => window.removeEventListener('click', close);
    }, []);

    const setTab = (t) => {
        setDesignsTab(t);
        setSearchParams(t === 'active' ? {} : { tab: t });
    };

    const handleDeleteProject = async (id) => {
        const confirmDelete = window.confirm('Move this project to trash?');
        if (!confirmDelete) return;
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/projects/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });
            if (res.ok) {
                toast('Project moved to trash');
                setProjects((prev) => {
                    const removed = prev.find((p) => p._id === id);
                    if (removed) setTrashedProjects((tp) => [removed, ...tp]);
                    return prev.filter((p) => p._id !== id);
                });
                setOpenMenuId(null);
            }
        } catch (err) {
            console.error('Delete error:', err);
        }
    };

    const handleRestoreProject = async (id) => {
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/projects/${id}/restore`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });
            if (res.ok) {
                toast.success('Project restored');
                setTrashedProjects((prev) => {
                    const restored = prev.find((p) => p._id === id);
                    if (restored) setProjects((ps) => [restored, ...ps]);
                    return prev.filter((p) => p._id !== id);
                });
            }
        } catch (err) {
            console.error('Restore error:', err);
        }
    };

    const handlePermanentDelete = async (id) => {
        const confirmDelete = window.confirm('This will permanently delete the project. Continue?');
        if (!confirmDelete) return;
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/projects/${id}/permanent`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });
            if (res.ok) {
                toast('Project permanently deleted');
                setTrashedProjects((prev) => prev.filter((p) => p._id !== id));
            }
        } catch (err) {
            console.error('Permanent delete error:', err);
        }
    };

    /* ── KPI metrics derived from projects ── */
    const kpiData = useMemo(() => {
        const total = projects.length;
        const active = projects.filter(p => getProjectStatus(p) === 'Active').length;
        const completed = projects.filter(p => getProjectStatus(p) === 'Completed').length;
        const onHold = projects.filter(p => getProjectStatus(p) === 'On Hold').length;
        return { total, active, completed, onHold };
    }, [projects]);

    /* ── Tab button ── */
    const tabBtn = (key, label, count) => (
        <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${designsTab === key
                ? 'bg-brand-50 text-brand'
                : 'text-textsec hover:bg-appbg hover:text-textpri'
                }`}
            role="tab"
            aria-selected={designsTab === key}
        >
            {label}
            <span className="ml-2 text-xs opacity-70">{count}</span>
        </button>
    );

    return (
        <div className="flex-1 overflow-hidden">

            <div className="h-full">
                {activeView === 'your-designs' && (
                    <>
                        {/* ── KPI Summary Cards ── */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                            <KPICard
                                label="Total Projects"
                                value={kpiData.total}
                                icon={Briefcase}
                                iconBg="bg-[#2C97D4]/10"
                                iconColor="text-[#2C97D4]"
                                delta="+12%"
                                deltaUp={true}
                            />
                            <KPICard
                                label="Active"
                                value={kpiData.active}
                                icon={Clock}
                                iconBg="bg-emerald-400/10"
                                iconColor="text-emerald-500"
                                delta="+8%"
                                deltaUp={true}
                            />
                            <KPICard
                                label="Completed"
                                value={kpiData.completed}
                                icon={CheckCircle2}
                                iconBg="bg-violet-400/10"
                                iconColor="text-violet-500"
                                delta="+5%"
                                deltaUp={true}
                            />
                            <KPICard
                                label="On Hold"
                                value={kpiData.onHold}
                                icon={PauseCircle}
                                iconBg="bg-amber-400/10"
                                iconColor="text-amber-500"
                                delta="-3%"
                                deltaUp={false}
                            />
                        </div>

                        {/* ── Tabs ── */}
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-1.5" role="tablist" aria-label="Designs tabs">
                                {tabBtn('active', 'Active', projects.length)}
                                {tabBtn('shared', 'Shared', sharedProjects.length)}
                                {tabBtn('trash', 'Trash', trashedProjects.length)}
                            </div>

                            {userPlan === 'Free' && (
                                <div className="text-xs bg-amber-400/10 text-amber-500 px-3 py-1.5 rounded-lg font-medium">
                                    Free plan: 1 shared project
                                </div>
                            )}
                        </div>

                        {/* ── ACTIVE tab ── */}
                        {designsTab === 'active' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                {projects.map((proj, idx) => (
                                    <ProjectCard
                                        key={proj._id}
                                        proj={proj}
                                        index={idx}
                                        openMenuId={openMenuId}
                                        setOpenMenuId={setOpenMenuId}
                                        onNavigate={navigate}
                                        onOpenShare={onOpenShare}
                                        onDelete={handleDeleteProject}
                                    />
                                ))}
                                {projects.length === 0 && (
                                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
                                        <div className="w-16 h-16 rounded-lg bg-borderlight flex items-center justify-center mb-4">
                                            <Briefcase className="w-7 h-7 text-textsec" />
                                        </div>
                                        <p className="text-textpri font-semibold text-lg">No projects yet</p>
                                        <p className="text-textsec text-sm mt-1">Create your first project to get started</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── SHARED tab ── */}
                        {designsTab === 'shared' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                {sharedProjects.map((proj, idx) => (
                                    <div key={proj._id} className="bg-surface rounded-lg border border-border p-5 flex flex-col gap-3 transition-shadow duration-150 hover:shadow-card-hover cursor-pointer" onClick={() => navigate(`/digital-twin?id=${proj._id}`)}>
                                        <div className="flex items-start gap-3">
                                            <div className={`w-10 h-10 rounded-lg ${PROJECT_COLORS[idx % PROJECT_COLORS.length]} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                                                {(proj.name || 'P').charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-semibold text-textpri text-[15px] truncate" style={{ fontFamily: "'Syne', 'Inter', sans-serif" }}>{proj.name}</div>
                                                <div className="text-[14px] text-textsec mt-0.5">Owner: {proj.owner?.name || '—'}</div>
                                            </div>
                                        </div>
                                        <span className={`inline-flex items-center self-start gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${proj.myPermission === 'edit' ? 'bg-emerald-400/10 text-emerald-500' : 'bg-[#2C97D4]/10 text-[#2C97D4]'}`}>
                                            {proj.myPermission === 'edit' ? 'Can edit' : 'View only'}
                                        </span>
                                    </div>
                                ))}
                                {sharedProjects.length === 0 && (
                                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
                                        <p className="text-textsec text-sm">Projects shared with you will appear here.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── TRASH tab ── */}
                        {designsTab === 'trash' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                {trashedProjects.map((proj) => (
                                    <div
                                        key={proj._id}
                                        className="bg-surface rounded-lg border border-border p-5 flex flex-col justify-between gap-3 transition-shadow duration-150 hover:shadow-card-hover"
                                    >
                                        <div>
                                            <div className="text-sm font-semibold text-textpri truncate mb-1">{proj.name}</div>
                                            <div className="text-xs text-textsec line-clamp-2 mb-1">{proj.description}</div>
                                            <div className="text-xs text-textsec">
                                                Deleted: {new Date(proj.deletedAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                className="flex-1 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-medium hover:bg-brand-600 transition-colors"
                                                onClick={() => handleRestoreProject(proj._id)}
                                            >
                                                Restore
                                            </button>
                                            <button
                                                className="flex-1 px-3 py-1.5 rounded-lg bg-error/10 text-error text-xs font-medium hover:bg-error/20 transition-colors"
                                                onClick={() => handlePermanentDelete(proj._id)}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {trashedProjects.length === 0 && (
                                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
                                        <p className="text-textsec text-sm">Trash is empty.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}

                {/* Other panels */}
                {(activeView === 'templates' ||
                    activeView === 'meshai' ||
                    activeView === 'team' ||
                    activeView === 'experiences') && (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <h2 className="text-2xl font-bold text-textpri capitalize">{activeView.replace('-', ' ')}</h2>
                                <p className="text-textsec mt-2 text-sm">This feature is coming soon.</p>
                            </div>
                        </div>
                    )}

                {activeView === 'team' && <TeamPanel userPlan={userPlan} />}

                {activeView === 'profile' && <ProfileView setActiveView={setActiveView} />}

                {activeView === 'profileedit' && <ProfileEdit setActiveView={setActiveView} />}

                {activeView === 'analytics' && (
                    <AnalyticsDashboard projects={projects.map((p) => ({ id: p.id || p._id, name: p.name }))} />
                )}

                {activeView === 'billing' && <BillingPricing />}
            </div>
        </div>
    );
}
