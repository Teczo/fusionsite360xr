// src/pages/DashboardPage.jsx
import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import Sidebar from '../components/dashboard/Sidebar';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import DashboardPanel from '../components/dashboard/DashboardPanel';

// Phase 1 Team feature components
import TeamPanel from '../components/team/TeamPanel';
import ShareProjectModal from '../components/team/ShareProjectModal';
import useUserPlan from '../components/hooks/useUserPlan';

// Digital Twin Dashboard Widgets
import TimelineWidget from '../components/DashboardWidgets/TimelineWidget';
import HSEWidget from '../components/DashboardWidgets/HSEWidget';
import AlertsWidget from '../components/DashboardWidgets/AlertsWidget';
import SCurveWidget from '../components/DashboardWidgets/SCurveWidget';
import MediaWidget from '../components/DashboardWidgets/MediaWidget';
import DigitalTwinPreviewWidget from '../components/DashboardWidgets/DigitalTwinPreviewWidget';

export default function DashboardPage() {
    const { panel } = useParams(); // e.g., 'your-designs' | 'team' | 'billing' ...
    const navigate = useNavigate();
    const location = useLocation();

    // ---- Core state ----
    const [projects, setProjects] = useState([]);
    const [trashedProjects, setTrashedProjects] = useState([]);
    const [sharedProjects, setSharedProjects] = useState([]); // NEW

    const [activeView, setActiveView] = useState(panel || 'your-designs');
    const [openMenuId, setOpenMenuId] = useState(null);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

    // Create project modal (existing flow)
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ name: '', description: '' });

    // Profile / plan
    const [user, setUser] = useState({ name: 'User' });
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem('token');

    // ---- Share modal state (NEW) ----
    const [shareOpen, setShareOpen] = useState(false);
    const [shareProject, setShareProject] = useState(null);

    const { loading: planLoading, plan, capabilitiesTier, limits, profile } = useUserPlan();
    const defaultLimits = { sharedProjects: { max: 1 }, teamMembers: { max: 3 }, uploadSizeMB: 25, watermark: true };

    // Derived
    const billingLabel = (plan === 'FOUNDING') ? 'Founding'
        : (plan === 'SINGLE') ? 'Single'
            : 'Free';

    // ---- Helpers ----
    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    // Keep <html> class in sync with theme
    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
        localStorage.setItem('theme', theme);
    }, [theme]);

    // Sync view when URL changes (back/forward)
    useEffect(() => {
        const next = panel || 'your-designs';
        if (next !== activeView) setActiveView(next);
    }, [panel]);

    // Single source of truth for changing panels (push to URL)
    const go = (view) => {
        setActiveView(view);
        navigate(`/dashboard/${view}`);
    };

    // Profile (plan/limits)
    useEffect(() => {
        const tk = localStorage.getItem('token');
        if (!tk) return navigate('/signin');

        (async () => {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/api/profile`, {
                    headers: { Authorization: `Bearer ${tk}` },
                });
                const data = await res.json();
                if (res.ok) setUser(data || {});
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // ---- Data fetchers ----
    const fetchProjects = async () => {
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/projects`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (res.ok) setProjects(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchTrashedProjects = async () => {
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/projects/trashed`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (res.ok) setTrashedProjects(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
        }
    };

    // NEW: shared projects (shared with me)
    const fetchSharedProjects = async () => {
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/projects/shared`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (res.ok) setSharedProjects(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
        }
    };

    // Initial data
    useEffect(() => {
        if (!token) return navigate('/signin');
        fetchProjects();
        fetchTrashedProjects();
        fetchSharedProjects(); // NEW
    }, [token]);

    // ---- Create project ----
    const handleCreate = async () => {
        if (!form.name || !form.description) return;
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/projects`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) {
                alert(data?.error || 'Failed to create project');
                return;
            }
            setProjects((prev) => [data, ...prev]);
            setShowModal(false);
            navigate(`/studio?id=${data._id}`);
        } catch (err) {
            console.error(err);
            alert('Network error');
        }
    };

    // ---- Share modal handlers (open/close) ----
    const onOpenShare = (proj) => {
        setShareProject(proj);
        setShareOpen(true);
        setOpenMenuId(null);
    };

    // ===========================
    //   TEAM API (Phase 1 stubs)
    // ===========================
    const fetchTeam = async () => {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/team`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return [];
        return res.json(); // [{id, name, email, role, status}]
    };

    const inviteUser = async (email) => {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/team/invite`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ email }),
        });
        if (!res.ok) return null;
        return res.json(); // { id, name, email, role:'Member', status:'Pending' }
    };

    const updateRole = async (memberId, role) => {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/team/${memberId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ role }),
        });
        return res.ok;
    };

    const removeMember = async (memberId) => {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/team/${memberId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.ok;
    };

    // ================================
    //   SHARE MODAL API (Phase 1 stubs)
    // ================================
    const loadAccessList = async () => {
        if (!shareProject?._id) return [];
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/projects/${shareProject._id}/access`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return [];
        return res.json(); // [{id, name, email, permission:'view'|'edit', fromTeam, status}]
    };

    const searchTeam = async (q) => {
        if (!q) return [];
        const res = await fetch(
            `${import.meta.env.VITE_API_URL}/api/team/search?q=${encodeURIComponent(q)}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) return [];
        return res.json(); // [{id, name, email}]
    };

    const inviteToProject = async (emailOrUserId, permission) => {
        if (!shareProject?._id) return null;
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/projects/${shareProject._id}/share`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ target: emailOrUserId, permission }),
        });
        if (!res.ok) return null;
        const row = await res.json();
        // refresh "Shared" list for me (if needed)
        fetchSharedProjects();
        return row;
    };

    const updatePermission = async (userId, permission) => {
        if (!shareProject?._id) return false;
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/projects/${shareProject._id}/access/${userId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ permission }),
        });
        return res.ok;
    };

    const removeAccess = async (userId) => {
        if (!shareProject?._id) return false;
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/projects/${shareProject._id}/access/${userId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) fetchSharedProjects();
        return res.ok;
    };

    // ---- Layout ----
    return (
        <div
            className="flex h-screen text-white bg-cover bg-center bg-[#18191e]"
            style={{ backgroundImage: "url('/images/dashboard-bg.png')" }}
        >
            <Sidebar
                isCollapsed={isCollapsed}
                setIsCollapsed={setIsCollapsed}
                setShowModal={setShowModal}
                userName={user?.name || 'User'}
                billingTier={billingLabel}
            />

            <div className={`flex-1 transition-all duration-300 ${isCollapsed ? 'pl-29' : 'pl-72'} pt-4 pr-4 pb-4`}>
                <div className="flex flex-col h-full">
                    {/* Top Header */}
                    <div className="flex pt-4 z-50 mb-4">
                        <DashboardHeader
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                            theme={theme}
                            setTheme={setTheme}
                            user={user}
                            setActiveView={go}
                        />
                    </div>

                    {/* Digital Twin Overview panel */}
                    {activeView === 'digital-twin' && (
                        <div className="flex-1 overflow-y-auto">
                            <div className="h-full bg-black/30 backdrop-blur-lg border border-white/10 rounded-2xl p-6 overflow-y-auto">
                                <h2 className="text-xl font-bold text-white mb-6">Digital Twin Operations</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                                    <TimelineWidget projects={projects} />
                                    <HSEWidget projects={projects} />
                                    <AlertsWidget projects={projects} />
                                    <SCurveWidget projects={projects} />
                                    <DigitalTwinPreviewWidget
                                        projects={projects}
                                        onOpen={(id) => navigate(`/digital-twin?id=${id}`)}
                                    />
                                    <MediaWidget projects={projects} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Main panel: Designs (Active/Shared/Trash) */}
                    {activeView !== 'team' && activeView !== 'digital-twin' && (
                        <DashboardPanel
                            activeView={activeView}
                            projects={projects}
                            sharedProjects={sharedProjects}
                            trashedProjects={trashedProjects}
                            openMenuId={openMenuId}
                            setOpenMenuId={setOpenMenuId}
                            handleChange={handleChange}
                            handleCreate={handleCreate}
                            setProjects={setProjects}
                            setTrashedProjects={setTrashedProjects}
                            setActiveView={go}
                            onOpenShare={onOpenShare}
                            userPlan={capabilitiesTier}
                            planLimits={limits}
                        />
                    )}

                    {/* Team panel */}
                    {activeView === 'team' && (
                        <div className="mt-[-16px]">
                            <TeamPanel
                                userPlan={capabilitiesTier}
                                planLimits={limits || defaultLimits}
                                fetchTeam={fetchTeam}
                                inviteUser={inviteUser}
                                updateRole={updateRole}
                                removeMember={removeMember}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Create Project Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-[#2c2e3a] border border-white/20 p-6 rounded-lg w-full max-w-md shadow-2xl text-white">
                        <h2 className="text-xl font-bold mb-4">Create New Project</h2>
                        <input
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            placeholder="Project Name"
                            className="w-full bg-[#18191e] border border-white/20 px-3 py-2 rounded mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <textarea
                            name="description"
                            value={form.description}
                            onChange={handleChange}
                            placeholder="Give your project a short description"
                            className="w-full bg-[#18191e] border border-white/20 px-3 py-2 rounded mb-4 h-24 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 bg-gray-600/50 hover:bg-gray-500/50 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreate}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Share Project Modal (Phase 1) */}
            <ShareProjectModal
                open={shareOpen}
                onClose={() => setShareOpen(false)}
                project={shareProject}
                loadAccessList={loadAccessList}
                searchTeam={searchTeam}
                inviteToProject={inviteToProject}
                updatePermission={updatePermission}
                removeAccess={removeAccess}
                userPlan={capabilitiesTier}
                sharedCount={sharedProjects?.length || 0}
                planLimits={limits || defaultLimits}
            />
        </div>
    );
}
