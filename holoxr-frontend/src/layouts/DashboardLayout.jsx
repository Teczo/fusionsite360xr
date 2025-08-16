import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/dashboard/Sidebar';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import { toast } from 'react-hot-toast';

export default function DashboardLayout() {
    // Global dashboard UI state (single source of truth)
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [activeView, setActiveView] = useState('your-designs');
    const [searchQuery, setSearchQuery] = useState('');
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [projectName, setProjectName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    // Optional: simple user object for avatar initials
    const [user] = useState({ name: 'Alex Johnson', email: 'alex@example.com' });

    const navigate = useNavigate();
    const location = useLocation();

    // Keep <html> class in sync with theme
    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
        localStorage.setItem('theme', theme);
    }, [theme]);

    // Adjust left padding to account for fixed sidebar width
    const contentPaddingLeft = isCollapsed ? 'pl-24' : 'pl-72'; // 6rem vs 18rem

    // Outlet context so children (DashboardPage etc.) can read state
    const outletCtx = useMemo(
        () => ({
            isCollapsed,
            setIsCollapsed,
            activeView,
            setActiveView,
            searchQuery,
            setSearchQuery,
            theme,
            setTheme,
            user,
            navigate,
        }),
        [isCollapsed, activeView, searchQuery, theme, user, navigate]
    );

    return (
        <div className="relative flex h-screen w-full bg-[#f7f7f9] dark:bg-[#0b0c0f] text-slate-900 dark:text-white overflow-hidden">
            {/* Background image (optional) */}
            {/* <img src="/dashboard-bg.png" className="pointer-events-none select-none absolute inset-0 w-full h-full object-cover opacity-10" alt="" /> */}

            {/* Fixed Sidebar */}
            <Sidebar
                isCollapsed={isCollapsed}
                setIsCollapsed={setIsCollapsed}
                activeView={activeView}
                setActiveView={setActiveView}
                onCreate={() => setShowCreateModal(true)}
            />

            {/* Top Header (sits above glass panel). z-50 prevents overlap issues */}
            <div className={`fixed top-0 right-0 left-0 ${contentPaddingLeft} pr-6 pt-4 z-50`}>
                <DashboardHeader searchQuery={searchQuery} setSearchQuery={setSearchQuery} theme={theme} setTheme={setTheme} user={user} />
            </div>

            {/* Main Glass Panel container (single source) */}
            <main
                className={`${contentPaddingLeft} pt-24 pr-6 pb-6 w-full h-full overflow-y-auto`}
                aria-label="Dashboard content"
            >
                <div className="w-full min-h-[calc(100vh-7rem)] rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/90 dark:bg-white/5 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
                    {/* Page body area */}
                    <div className="p-4 sm:p-6 lg:p-8">
                        <Outlet context={outletCtx} />
                    </div>
                </div>
            </main>

            {/* Create Project Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreateModal(false)} />
                    <form
                        onSubmit={handleCreateProject}
                        className="relative w-full max-w-md rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white dark:bg-[#121317] p-6 shadow-2xl"
                    >
                        <h3 className="text-lg font-semibold mb-4">Create Project</h3>
                        <label className="block text-sm mb-2">Project name</label>
                        <input
                            autoFocus
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            className="w-full rounded-xl bg-white/90 dark:bg-white/10 border border-slate-300/70 dark:border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
                            placeholder="e.g., TVET Lathe Module"
                        />
                        <div className="flex items-center justify-end gap-2">
                            <button type="button" onClick={() => setShowCreateModal(false)} className="px-3 py-2 text-sm rounded-xl border border-slate-300/70 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10">Cancel</button>
                            <button type="submit" disabled={isCreating} className="px-3 py-2 text-sm rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-70">{isCreating ? 'Creating…' : 'Create'}</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}