// WorkspacePage.jsx — Workspace selector shown after login, before dashboard
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, ArrowRight, MapPin, User, LogOut } from 'lucide-react';
import { useTheme } from '../App';

/* ── Static workspace data ─────────────────────────────────────────────────── */

const WORKSPACES = [
    {
        id: 'my',
        name: 'Malaysia',
        code: 'MY',
        description: 'Access construction projects and digital twin assets across Malaysia, including infrastructure and property development operations.',
    },
    {
        id: 'sg',
        name: 'Singapore',
        code: 'SG',
        description: 'Manage urban development and smart-city projects for Singapore assets, including BIM-integrated site operations.',
    },
    {
        id: 'au',
        name: 'Australia',
        code: 'AU',
        description: 'Oversee infrastructure and mining operations across Australia, with real-time AR monitoring and digital twin dashboards.',
    },
];

const WORKSPACE_STATS = {
    my: { projects: 12, assets: 234, docs: 1823 },
    sg: { projects:  8, assets: 156, docs: 1245 },
    au: { projects: 15, assets: 289, docs: 2104 },
};

/* ── Component ─────────────────────────────────────────────────────────────── */

export default function WorkspacePage() {
    const navigate = useNavigate();
    const { darkMode } = useTheme();
    const [user, setUser] = useState({ name: 'User', role: '' });

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return navigate('/signin', { replace: true });

        (async () => {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/api/profile`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    setUser({ name: data?.name || 'User', role: data?.role || '' });
                }
            } catch {
                // silently ignore
            }
        })();
    }, []);

    const handleSelect = (ws) => {
        localStorage.setItem('workspace', `${ws.name} Workspace`);
        navigate('/dashboard/your-designs');
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/signin', { replace: true });
    };

    // ES dark mode uses a specific structural palette:
    // Sidebar + header: #0f172a (slate-900)
    // Main shell:       #1e293b (slate-800)
    // Cards:            #0f172a (slate-900)
    // Card header grad: #334155 → #1e293b
    const dk = darkMode;

    return (
        <div className={`flex h-screen font-sans overflow-hidden transition-colors duration-200 ${dk ? 'bg-[#1e293b] text-white' : 'bg-appbg text-textpri'}`}>

            {/* ── Sidebar ─────────────────────────────────────────────────── */}
            <aside className={`w-64 flex flex-col z-20 shrink-0 shadow-lg transition-colors duration-200 ${dk ? 'bg-[#0f172a] border-r border-[#334155]' : 'bg-surface border-r border-border shadow-sidebar'}`}>
                <div className="p-6">
                    {/* Brand */}
                    <div className="flex items-center gap-3 mb-8">
                        <img src="/holo-icon.png" alt="FusionXR" className="h-8 w-auto" />
                        <span className={`text-xl font-bold tracking-tight ${dk ? 'text-white' : 'text-textpri'}`} style={{ fontFamily: "'Syne', 'Inter', sans-serif" }}>
                            FusionXR
                        </span>
                    </div>

                    {/* Workspace label */}
                    <div className="mb-8">
                        <label className={`text-xs font-bold uppercase tracking-wider mb-2 block ${dk ? 'text-[#64748b]' : 'text-texttert'}`}>
                            Workspace
                        </label>
                        <div className={`text-sm border rounded-lg px-4 py-2.5 ${dk ? 'bg-[#1e293b] text-[#94a3b8] border-[#334155]' : 'bg-appbg text-textsec border-border'}`}>
                            Not selected
                        </div>
                    </div>

                    {/* Ghost nav items */}
                    <nav className="space-y-1 opacity-40 pointer-events-none select-none">
                        {['Dashboard', 'Digital Twin', 'Team', 'Analytics'].map((item) => (
                            <div
                                key={item}
                                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium ${dk ? 'text-[#94a3b8]' : 'text-textsec'}`}
                            >
                                <div className={`w-5 h-5 rounded ${dk ? 'bg-[#334155]' : 'bg-borderlight'}`} />
                                {item}
                            </div>
                        ))}
                    </nav>
                </div>

                {/* Footer */}
                <div className={`mt-auto p-5 space-y-3 border-t ${dk ? 'border-[#334155]' : 'border-border'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${dk ? 'bg-[#334155]' : 'bg-borderlight'}`}>
                            <User size={18} className={dk ? 'text-[#94a3b8]' : 'text-textsec'} />
                        </div>
                        <div className="min-w-0">
                            <div className={`text-sm font-semibold truncate ${dk ? 'text-white' : 'text-textpri'}`}>{user.name}</div>
                            <div className={`text-xs truncate ${dk ? 'text-[#64748b]' : 'text-texttert'}`}>{user.role || 'Member'}</div>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${dk ? 'text-[#94a3b8] hover:bg-red-500/10 hover:text-red-400' : 'text-textsec hover:bg-error/10 hover:text-error'}`}
                    >
                        <LogOut size={15} />
                        Logout
                    </button>
                </div>
            </aside>

            {/* ── Main ────────────────────────────────────────────────────── */}
            <main className="flex-1 flex flex-col overflow-hidden">

                {/* Header */}
                <header className={`h-16 flex items-center px-8 shrink-0 transition-colors duration-200 ${dk ? 'bg-[#0f172a] border-b border-[#334155]' : 'bg-surface border-b border-border shadow-header'}`}>
                    <span className={`font-bold text-base ${dk ? 'text-white' : 'text-textpri'}`} style={{ fontFamily: "'Syne', 'Inter', sans-serif" }}>
                        Workspace Selection
                    </span>
                </header>

                {/* Content */}
                <div className="flex-1 overflow-auto p-8">
                    <div className="max-w-6xl mx-auto">

                        {/* Page heading */}
                        <div className="mb-8">
                            <h1 className={`text-3xl font-bold mb-2 ${dk ? 'text-white' : 'text-textpri'}`} style={{ fontFamily: "'Syne', 'Inter', sans-serif" }}>
                                Select Your Workspace
                            </h1>
                            <p className={`text-sm ${dk ? 'text-[#cbd5e1]' : 'text-textsec'}`}>
                                Choose a country workspace to access your projects, assets, and documents
                            </p>
                        </div>

                        {/* Cards grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {WORKSPACES.map((ws) => {
                                const stats = WORKSPACE_STATS[ws.id] || { projects: 0, assets: 0, docs: 0 };
                                return (
                                    <button
                                        key={ws.id}
                                        onClick={() => handleSelect(ws)}
                                        className={`group rounded-xl border text-left flex flex-col overflow-hidden transition-all duration-300 shadow-sm hover:shadow-xl ${
                                            dk
                                                ? 'bg-[#0f172a] border-[#334155] hover:border-[#76C267]'
                                                : 'bg-surface border-border hover:border-accent hover:shadow-lg'
                                        }`}
                                        style={{ minHeight: '320px' }}
                                    >
                                        {/* Card header — gradient tint section */}
                                        <div className={`p-6 border-b ${
                                            dk
                                                ? 'bg-gradient-to-br from-[#334155] to-[#1e293b] border-[#334155]'
                                                : 'bg-appbg border-border'
                                        }`}>
                                            <div className="flex items-start justify-between mb-4">
                                                {/* Globe icon badge */}
                                                <div className="p-3 rounded-lg bg-gradient-to-r from-[#2C97D4] to-[#76C267] group-hover:scale-105 transition-transform duration-300">
                                                    <Globe size={28} className="text-white" />
                                                </div>
                                                {/* Arrow button */}
                                                <div className={`p-2 rounded-lg transition-colors ${
                                                    dk
                                                        ? 'bg-[#76C267]/10 group-hover:bg-[#76C267]'
                                                        : 'bg-accent/10 group-hover:bg-accent'
                                                }`}>
                                                    <ArrowRight size={18} className={`transition-colors ${
                                                        dk
                                                            ? 'text-[#76C267] group-hover:text-white'
                                                            : 'text-accent group-hover:text-white'
                                                    }`} />
                                                </div>
                                            </div>
                                            <h3 className={`text-xl font-bold mb-1 transition-colors ${
                                                dk
                                                    ? 'text-white group-hover:text-[#76C267]'
                                                    : 'text-textpri group-hover:text-accent'
                                            }`} style={{ fontFamily: "'Syne', 'Inter', sans-serif" }}>
                                                {ws.name}
                                            </h3>
                                            <div className={`flex items-center gap-1.5 text-sm ${dk ? 'text-[#94a3b8]' : 'text-textsec'}`}>
                                                <MapPin size={14} />
                                                <span className="font-medium">{ws.code}</span>
                                            </div>
                                        </div>

                                        {/* Card body */}
                                        <div className="p-6 flex flex-col justify-between flex-1">
                                            <p className={`text-sm leading-relaxed mb-6 ${dk ? 'text-[#cbd5e1]' : 'text-textsec'}`}>
                                                {ws.description}
                                            </p>
                                            <div className="flex gap-6 text-xs">
                                                <div>
                                                    <div className={`font-bold text-lg leading-tight ${dk ? 'text-white' : 'text-textpri'}`}>{stats.projects}</div>
                                                    <div className={`mt-0.5 ${dk ? 'text-[#94a3b8]' : 'text-texttert'}`}>Projects</div>
                                                </div>
                                                <div>
                                                    <div className={`font-bold text-lg leading-tight ${dk ? 'text-white' : 'text-textpri'}`}>{stats.assets}</div>
                                                    <div className={`mt-0.5 ${dk ? 'text-[#94a3b8]' : 'text-texttert'}`}>Assets</div>
                                                </div>
                                                <div>
                                                    <div className={`font-bold text-lg leading-tight ${dk ? 'text-white' : 'text-textpri'}`}>{stats.docs}</div>
                                                    <div className={`mt-0.5 ${dk ? 'text-[#94a3b8]' : 'text-texttert'}`}>Documents</div>
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Note banner */}
                        <div className={`mt-8 p-4 rounded-lg border ${
                            dk
                                ? 'bg-blue-900/30 border-[#1e40af]'
                                : 'bg-[#2C97D4]/10 border-[#2C97D4]/20'
                        }`}>
                            <p className={`text-sm ${dk ? 'text-[#cbd5e1]' : 'text-textpri'}`}>
                                <span className="font-semibold">Note:</span> Your workspace selection determines which regional data and projects you can access. You can switch workspaces anytime from the sidebar.
                            </p>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
}
