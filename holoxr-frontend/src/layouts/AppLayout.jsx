import { Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/dashboard/Sidebar';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import useSidebarState from '../components/hooks/useSidebarState';

export default function AppLayout() {
    const {
        sidebarOpen,
        setSidebarOpen,
        sidebarCollapsed,
        setSidebarCollapsed,
        isMobile,
        isTablet,
        isDesktop,
        toggleSidebar,
    } = useSidebarState();

    const [searchQuery, setSearchQuery] = useState('');
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [projectName, setProjectName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const [user] = useState({ name: 'Alex Johnson', email: 'alex@example.com' });

    const navigate = useNavigate();

    // Keep <html> class in sync with theme
    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
        localStorage.setItem('theme', theme);
    }, [theme]);

    // Outlet context so children can read shared state
    const outletCtx = useMemo(
        () => ({
            sidebarCollapsed,
            setSidebarCollapsed,
            searchQuery,
            setSearchQuery,
            theme,
            setTheme,
            user,
            navigate,
            showCreateModal,
            setShowCreateModal,
        }),
        [sidebarCollapsed, searchQuery, theme, user, navigate, showCreateModal]
    );

    const handleCreateProject = (e) => {
        e.preventDefault();
        // placeholder — pages can override via outletCtx.setShowCreateModal
    };

    return (
        <div className="flex h-dvh overflow-hidden bg-[#f7f7f9] dark:bg-[#0b0c0f] text-slate-900 dark:text-white">
            {/* Mobile overlay backdrop */}
            {isMobile && sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30"
                    onClick={() => setSidebarOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar */}
            <Sidebar
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                sidebarCollapsed={sidebarCollapsed}
                setSidebarCollapsed={setSidebarCollapsed}
                isMobile={isMobile}
                setShowModal={setShowCreateModal}
                userName={user.name}
            />

            {/* Right column: topbar + content */}
            <div className="flex flex-1 flex-col min-w-0">
                {/* Topbar — in flex flow, NOT fixed */}
                <DashboardHeader
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    theme={theme}
                    setTheme={setTheme}
                    user={user}
                    setShowModal={setShowCreateModal}
                    onToggleSidebar={toggleSidebar}
                />

                {/* Main scrollable content area */}
                <main
                    className="flex-1 overflow-auto min-h-0 p-4 sm:p-6"
                    aria-label="Dashboard content"
                >
                    <div className="w-full min-h-full rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white/90 dark:bg-white/5 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
                        <div className="p-4 sm:p-6 lg:p-8">
                            <Outlet context={outletCtx} />
                        </div>
                    </div>
                </main>
            </div>

            {/* Create Project Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreateModal(false)} />
                    <form
                        onSubmit={handleCreateProject}
                        className="relative w-full max-w-md rounded-2xl border border-slate-200/70 dark:border-white/10 bg-white dark:bg-[#121317] p-6 shadow-2xl mx-4"
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
