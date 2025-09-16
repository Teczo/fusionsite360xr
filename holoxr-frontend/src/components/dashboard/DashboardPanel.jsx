// DashboardPanel.jsx — brand theme applied, glass panel preserved
import { useEffect, useMemo, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import ProfileEdit from '../../pages/ProfilePage';
import ProfileView from '../../pages/ProfileView';
import AnalyticsDashboard from '../analytics/AnalyticsDashboard';
import BillingPricing from '../billing/BillingPricing';

export default function DashboardPanel({
    activeView,
    projects,
    trashedProjects,
    openMenuId,
    setOpenMenuId,
    handleChange,
    handleCreate,
    setProjects,
    setTrashedProjects,
    setActiveView,
}) {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // --- NEW: tab state for Your Designs
    const initialTab = (() => {
        const t = searchParams.get('tab');
        return t === 'trash' ? 'trash' : 'active';
    })();
    const [designsTab, setDesignsTab] = useState(initialTab);

    // keep tab in sync if the URL changes (back/forward)
    useEffect(() => {
        const t = searchParams.get('tab');
        const next = t === 'trash' ? 'trash' : 'active';
        if (next !== designsTab) setDesignsTab(next);
    }, [searchParams]);

    // If someone visits /dashboard/trash, redirect to the tabbed view
    useEffect(() => {
        if (activeView === 'trash') {
            navigate('/dashboard/your-designs?tab=trash', { replace: true });
        }
    }, [activeView, navigate]);

    const setTab = (t) => {
        setDesignsTab(t);
        // Optional: keep the URL shareable. Remove this line if you don't want ?tab=
        setSearchParams(t === 'trash' ? { tab: 'trash' } : {});
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
                toast('🗑 Project moved to trash');
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
                toast('🗑 Project permanently deleted');
                setTrashedProjects((prev) => prev.filter((p) => p._id !== id));
            }
        } catch (err) {
            console.error('Permanent delete error:', err);
        }
    };

    // --- small UI helpers
    const tabBtn = (key, label, count) => (
        <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-3 py-1.5 rounded-lg text-sm transition
        ${designsTab === key
                    ? 'bg-brand/10 text-brand border border-brand/30'
                    : 'text-textsec hover:bg-surface/70 hover:text-textpri'
                }`}
            role="tab"
            aria-selected={designsTab === key}
        >
            <span>{label}</span>
            <span className="ml-2 text-xs text-textsec/80">{count}</span>
        </button>
    );

    return (
        <div className="flex-1 overflow-hidden">
            {/* Glass panel kept exactly as requested */}
            <div className="h-full bg-black/30 backdrop-blur-lg border border-white/10 rounded-2xl p-6 overflow-y-auto">
                {/* ========== YOUR DESIGNS with Tabs ========== */}
                {activeView === 'your-designs' && (
                    <>
                        {/* Tab Bar */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2" role="tablist" aria-label="Designs tabs">
                                {tabBtn('active', 'Active', projects.length)}
                                {tabBtn('trash', 'Trash', trashedProjects.length)}
                            </div>
                            {/* (optional future) actions on the right */}
                        </div>

                        {/* ACTIVE grid */}
                        {designsTab === 'active' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                                {projects.map((proj) => (
                                    <div
                                        key={proj._id}
                                        className="relative bg-surface/80 border border-white/10 rounded-xl shadow-lg transition-all duration-300 group hover:scale-[1.02] hover:ring-2 hover:ring-brand/30"
                                    >
                                        {/* Card menu button */}
                                        <button
                                            onClick={() => setOpenMenuId(openMenuId === proj._id ? null : proj._id)}
                                            className="absolute top-2 left-2 z-20 rounded-full p-1.5 bg-black/50 hover:bg-black/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
                                            aria-label="Project menu"
                                        >
                                            <MoreHorizontal className="w-4 h-4 text-title" />
                                        </button>

                                        {/* Thumbnail + Meta */}
                                        <div onClick={() => navigate(`/studio?id=${proj._id}`)} className="cursor-pointer">
                                            <div className="h-36 bg-black/20">
                                                <img
                                                    src={proj.thumbnail || '/placeholder.png'}
                                                    alt="thumbnail"
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div className="p-3">
                                                <div className="font-semibold truncate text-title">{proj.name}</div>
                                                <div className="text-xs truncate text-subtle">{proj.description}</div>
                                                <div className="text-xs mt-1 text-textsec/80">
                                                    {new Date(proj.updatedAt).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Popover menu */}
                                        {openMenuId === proj._id && (
                                            <div className="absolute top-10 left-2 w-60 bg-surface/95 border border-white/10 rounded-xl shadow-2xl z-30 text-sm">
                                                <div className="p-3 border-b border-white/10">
                                                    <div className="truncate font-medium text-title">{proj.name}</div>
                                                    <div className="text-textsec text-xs mt-1">
                                                        Created by You<br />
                                                        {new Date(proj.createdAt).toLocaleDateString()}
                                                    </div>
                                                </div>
                                                <div className="p-2 space-y-1">
                                                    <button
                                                        className="w-full text-left px-3 py-1.5 rounded hover:bg-white/10 flex items-center gap-2 text-title"
                                                        onClick={() => window.open(`/studio?id=${proj._id}`, '_blank')}
                                                    >
                                                        🔗 Open in New Tab
                                                    </button>
                                                    <button
                                                        className="w-full text-left px-3 py-1.5 rounded hover:bg-white/10 flex items-center gap-2 text-title"
                                                        onClick={() =>
                                                            navigator.clipboard.writeText(`${window.location.origin}/studio?id=${proj._id}`)
                                                        }
                                                    >
                                                        📤 Share
                                                    </button>
                                                    <button
                                                        className="w-full text-left px-3 py-1.5 rounded flex items-center gap-2 text-red-400 hover:bg-red-500/15"
                                                        onClick={() => handleDeleteProject(proj._id)}
                                                    >
                                                        🗑 Move to Trash
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {projects.length === 0 && (
                                    <p className="text-textsec col-span-full text-center mt-10">No projects yet.</p>
                                )}
                            </div>
                        )}

                        {/* TRASH grid (same as your old 'trash' view) */}
                        {designsTab === 'trash' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
                                {trashedProjects.map((proj) => (
                                    <div
                                        key={proj._id}
                                        className="bg-surface/80 border border-white/10 rounded-xl shadow p-4 text-title relative flex flex-col justify-between"
                                    >
                                        <div>
                                            <div className="text-sm font-semibold truncate mb-1">{proj.name}</div>
                                            <div className="text-xs text-subtle mb-1 line-clamp-2">{proj.description}</div>
                                            <div className="text-xs text-textsec/80">
                                                Deleted: {new Date(proj.deletedAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <div className="mt-3 flex gap-2 text-xs">
                                            <button
                                                className="px-3 py-1 rounded bg-brand hover:bg-brand-600 text-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
                                                onClick={() => handleRestoreProject(proj._id)}
                                            >
                                                Restore
                                            </button>
                                            <button
                                                className="px-3 py-1 rounded bg-red-700 hover:bg-red-600 text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
                                                onClick={() => handlePermanentDelete(proj._id)}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {trashedProjects.length === 0 && (
                                    <p className="text-textsec col-span-full text-center mt-10">Trash is empty.</p>
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
                                <h2 className="text-3xl font-bold text-title capitalize">{activeView}</h2>
                                <p className="text-subtle mt-2">This feature is coming soon.</p>
                            </div>
                        </div>
                    )}

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
