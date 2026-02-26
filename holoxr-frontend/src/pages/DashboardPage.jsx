// src/pages/DashboardPage.jsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import { ChevronDown, Plus } from 'lucide-react';
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

    // ---- Core state ----
    const [projects, setProjects] = useState([]);
    const [trashedProjects, setTrashedProjects] = useState([]);
    const [sharedProjects, setSharedProjects] = useState([]);

    const [activeView, setActiveView] = useState(panel || 'your-designs');
    const [openMenuId, setOpenMenuId] = useState(null);

    // Create project modal
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({
        name: '', description: '', startDate: '', endDate: '',
        status: 'Planning', tags: '', projectCode: '', teamMembers: '',
        locationAddress: '', locationLat: '', locationLng: '',
    });

    // Progressive disclosure toggles
    const [showClassification, setShowClassification] = useState(false);
    const [showTeam, setShowTeam] = useState(false);
    const [showLocation, setShowLocation] = useState(false);

    // Sync modal with AppLayout context (Sidebar/Header "New Project" button)
    const outletCtx = useOutletContext();
    useEffect(() => {
        if (outletCtx?.showCreateModal) {
            setShowModal(true);
            outletCtx.setShowCreateModal(false);
        }
    }, [outletCtx?.showCreateModal]);

    // Profile / plan
    const [user, setUser] = useState({ name: 'User' });
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem('token');

    // ---- Share modal state ----
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
        fetchSharedProjects();
    }, [token]);

    // ---- Create project ----
    const handleCreate = async () => {
        if (!form.name) return;

        // Build clean payload — omit empty optional fields
        const payload = { name: form.name };

        if (form.description) payload.description = form.description;
        if (form.startDate) payload.startDate = form.startDate;
        if (form.endDate) payload.endDate = form.endDate;
        if (form.status) payload.status = form.status;
        if (form.projectCode) payload.projectCode = form.projectCode;

        // Tags: split comma-separated string, trim, remove empties
        const tagsArr = form.tags
            ? form.tags.split(',').map(t => t.trim()).filter(Boolean)
            : [];
        if (tagsArr.length > 0) payload.tags = tagsArr;

        // Team members: split comma-separated string
        const membersArr = form.teamMembers
            ? form.teamMembers.split(',').map(t => t.trim()).filter(Boolean)
            : [];
        if (membersArr.length > 0) payload.teamMembers = membersArr;

        // Location: only include if at least one field has value
        const loc = {};
        if (form.locationAddress) loc.address = form.locationAddress;
        if (form.locationLat) loc.latitude = parseFloat(form.locationLat);
        if (form.locationLng) loc.longitude = parseFloat(form.locationLng);
        if (Object.keys(loc).length > 0) payload.location = loc;

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/projects`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) {
                alert(data?.error || 'Failed to create project');
                return;
            }
            setProjects((prev) => [data, ...prev]);
            setShowModal(false);
            setForm({
                name: '', description: '', startDate: '', endDate: '',
                status: 'Planning', tags: '', projectCode: '', teamMembers: '',
                locationAddress: '', locationLat: '', locationLng: '',
            });
            setShowClassification(false);
            setShowTeam(false);
            setShowLocation(false);
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
        return res.json();
    };

    const inviteUser = async (email) => {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/team/invite`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ email }),
        });
        if (!res.ok) return null;
        return res.json();
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
        return res.json();
    };

    const searchTeam = async (q) => {
        if (!q) return [];
        const res = await fetch(
            `${import.meta.env.VITE_API_URL}/api/team/search?q=${encodeURIComponent(q)}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) return [];
        return res.json();
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

    // ---- Render (page content only — layout is handled by AppLayout) ----
    return (
        <>
            {/* Page Title */}
            <div className="mb-6">
                {activeView === 'your-designs' ? (
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <div className="text-2xl font-bold text-textpri" style={{ fontFamily: "'Syne', 'Inter', sans-serif" }}>
                                Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!
                            </div>
                            <p className="text-[14px] text-textsec mt-1">Here's your project overview</p>
                        </div>
                        <button
                            onClick={() => setShowModal(true)}
                            className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white btn-gradient-primary transition-all shadow-sm hover:shadow-md"
                        >
                            <Plus size={16} />
                            New Project
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="text-2xl font-bold text-textpri" style={{ fontFamily: "'Syne', 'Inter', sans-serif" }}>
                            {activeView === 'digital-twin' ? 'Digital Twin Operations' :
                                activeView === 'team' ? 'Team' :
                                    activeView === 'analytics' ? 'Analytics' :
                                        activeView === 'billing' ? 'Billing & Plans' :
                                            activeView === 'profile' ? 'Profile' :
                                                activeView.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </div>
                        <p className="text-sm text-textsec mt-1">
                            {activeView === 'digital-twin' ? 'Monitor your digital twin operations and analytics' :
                             activeView === 'team' ? 'Manage your workspace members and collaboration settings' :
                             activeView === 'analytics' ? 'Track project performance, engagement, and audience insights' :
                             activeView === 'billing' ? 'Manage your subscription and billing details' :
                             activeView === 'profile' ? 'Update your personal information and preferences' : ''}
                        </p>
                    </>
                )}
            </div>

            {/* Digital Twin Overview panel */}
            {activeView === 'digital-twin' && (
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
                <TeamPanel
                    userPlan={capabilitiesTier}
                    planLimits={limits || defaultLimits}
                    fetchTeam={fetchTeam}
                    inviteUser={inviteUser}
                    updateRole={updateRole}
                    removeMember={removeMember}
                />
            )}

            {/* Create Project Modal — Light theme */}
            {showModal && (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-xl mx-4 flex flex-col max-h-[85vh]">
                        <div className="p-7 pb-0 shrink-0">
                            <h2 className="text-xl font-bold text-textpri mb-5 tracking-tight" style={{ fontFamily: "'Syne', 'Inter', sans-serif" }}>Create New Project</h2>
                        </div>

                        {/* Scrollable body */}
                        <div className="flex-1 overflow-y-auto px-7 pb-2">
                            {/* ── Section 1: Basic Info (always visible) ── */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-textpri mb-1.5">
                                        Project Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        name="name"
                                        value={form.name}
                                        onChange={handleChange}
                                        placeholder="Enter project name"
                                        className="w-full bg-appbg border border-border px-4 py-2.5 rounded-lg text-sm text-textpri placeholder:text-textsec/60 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-textpri mb-1.5">Description</label>
                                    <textarea
                                        name="description"
                                        value={form.description}
                                        onChange={handleChange}
                                        placeholder="Give your project a short description"
                                        className="w-full bg-appbg border border-border px-4 py-2.5 rounded-lg text-sm text-textpri placeholder:text-textsec/60 h-20 resize-none focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-textpri mb-1.5">Start Date</label>
                                        <input
                                            type="date"
                                            name="startDate"
                                            value={form.startDate}
                                            onChange={handleChange}
                                            className="w-full bg-appbg border border-border px-4 py-2.5 rounded-lg text-sm text-textpri focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-textpri mb-1.5">End Date</label>
                                        <input
                                            type="date"
                                            name="endDate"
                                            value={form.endDate}
                                            onChange={handleChange}
                                            className="w-full bg-appbg border border-border px-4 py-2.5 rounded-lg text-sm text-textpri focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-textpri mb-1.5">Status</label>
                                    <select
                                        name="status"
                                        value={form.status}
                                        onChange={handleChange}
                                        className="w-full bg-appbg border border-border px-4 py-2.5 rounded-lg text-sm text-textpri focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all"
                                    >
                                        <option value="Planning">Planning</option>
                                        <option value="Active">Active</option>
                                        <option value="On Hold">On Hold</option>
                                        <option value="Completed">Completed</option>
                                    </select>
                                </div>
                            </div>

                            {/* ── Section 2: Classification (collapsible) ── */}
                            <div className="border-t border-borderlight mt-5 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setShowClassification(v => !v)}
                                    className="flex items-center gap-2 w-full text-left text-sm font-medium text-textsec hover:text-textpri transition-colors py-1.5"
                                >
                                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showClassification ? 'rotate-0' : '-rotate-90'}`} />
                                    Add Classification
                                </button>
                                <div
                                    className="overflow-hidden transition-all duration-300 ease-in-out"
                                    style={{ maxHeight: showClassification ? '200px' : '0px', opacity: showClassification ? 1 : 0 }}
                                >
                                    <div className="space-y-3 pt-3">
                                        <div>
                                            <label className="block text-sm font-medium text-textpri mb-1.5">Tags</label>
                                            <input
                                                name="tags"
                                                value={form.tags}
                                                onChange={handleChange}
                                                placeholder="e.g. structural, phase-1, urgent"
                                                className="w-full bg-appbg border border-border px-4 py-2.5 rounded-lg text-sm text-textpri placeholder:text-textsec/60 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-textpri mb-1.5">Project Code</label>
                                            <input
                                                name="projectCode"
                                                value={form.projectCode}
                                                onChange={handleChange}
                                                placeholder="e.g. PRJ-2026-001"
                                                className="w-full bg-appbg border border-border px-4 py-2.5 rounded-lg text-sm text-textpri placeholder:text-textsec/60 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ── Section 3: Team Members (collapsible) ── */}
                            <div className="border-t border-borderlight mt-3 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setShowTeam(v => !v)}
                                    className="flex items-center gap-2 w-full text-left text-sm font-medium text-textsec hover:text-textpri transition-colors py-1.5"
                                >
                                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showTeam ? 'rotate-0' : '-rotate-90'}`} />
                                    Add Team Members
                                </button>
                                <div
                                    className="overflow-hidden transition-all duration-300 ease-in-out"
                                    style={{ maxHeight: showTeam ? '120px' : '0px', opacity: showTeam ? 1 : 0 }}
                                >
                                    <div className="pt-3">
                                        <label className="block text-sm font-medium text-textpri mb-1.5">Team Members</label>
                                        <input
                                            name="teamMembers"
                                            value={form.teamMembers}
                                            onChange={handleChange}
                                            placeholder="Enter member IDs, comma-separated"
                                            className="w-full bg-appbg border border-border px-4 py-2.5 rounded-lg text-sm text-textpri placeholder:text-textsec/60 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* ── Section 4: Location (collapsible) ── */}
                            <div className="border-t border-borderlight mt-3 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setShowLocation(v => !v)}
                                    className="flex items-center gap-2 w-full text-left text-sm font-medium text-textsec hover:text-textpri transition-colors py-1.5"
                                >
                                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showLocation ? 'rotate-0' : '-rotate-90'}`} />
                                    Add Location
                                </button>
                                <div
                                    className="overflow-hidden transition-all duration-300 ease-in-out"
                                    style={{ maxHeight: showLocation ? '250px' : '0px', opacity: showLocation ? 1 : 0 }}
                                >
                                    <div className="space-y-3 pt-3">
                                        <div>
                                            <label className="block text-sm font-medium text-textpri mb-1.5">Address</label>
                                            <input
                                                name="locationAddress"
                                                value={form.locationAddress}
                                                onChange={handleChange}
                                                placeholder="e.g. 123 Main St, City"
                                                className="w-full bg-appbg border border-border px-4 py-2.5 rounded-lg text-sm text-textpri placeholder:text-textsec/60 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-sm font-medium text-textpri mb-1.5">Latitude</label>
                                                <input
                                                    type="number"
                                                    step="any"
                                                    name="locationLat"
                                                    value={form.locationLat}
                                                    onChange={handleChange}
                                                    placeholder="e.g. -26.2041"
                                                    className="w-full bg-appbg border border-border px-4 py-2.5 rounded-lg text-sm text-textpri placeholder:text-textsec/60 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-textpri mb-1.5">Longitude</label>
                                                <input
                                                    type="number"
                                                    step="any"
                                                    name="locationLng"
                                                    value={form.locationLng}
                                                    onChange={handleChange}
                                                    placeholder="e.g. 28.0473"
                                                    className="w-full bg-appbg border border-border px-4 py-2.5 rounded-lg text-sm text-textpri placeholder:text-textsec/60 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/50 transition-all"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Fixed footer */}
                        <div className="flex justify-end gap-3 p-7 pt-5 border-t border-borderlight shrink-0">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-5 py-2.5 bg-borderlight hover:bg-border text-textpri rounded-lg text-sm font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreate}
                                className="px-5 py-2.5 rounded-lg text-sm font-semibold btn-gradient-primary"
                            >
                                Create Project
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
        </>
    );
}
