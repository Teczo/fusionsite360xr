import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/dashboard/Sidebar';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import useSidebarState from '../components/hooks/useSidebarState';
import { useTheme } from '../App';

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
    const [showCreateModal, setShowCreateModal] = useState(false);
    const { darkMode, toggleDarkMode } = useTheme();

    const [user, setUser] = useState(null);

    const navigate = useNavigate();
    const location = useLocation();
    // Routes that need a full-viewport canvas with no padding wrapper
    const isFullPageRoute = location.pathname === '/twin';

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const token = localStorage.getItem("token");

                const res = await fetch(
                    `${import.meta.env.VITE_API_URL}/api/profile`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                if (!res.ok) throw new Error(`Load failed (${res.status})`);

                const data = await res.json();

                setUser({
                    name: data?.name,
                    plan: data?.plan || "Free",
                    avatar: data?.profile?.avatarUrl,
                });

            } catch (err) {
                console.error("Failed to fetch user:", err);
            }
        };

        fetchUser();
    }, []);

    // Outlet context so children can read shared state
    const outletCtx = useMemo(
        () => ({
            sidebarCollapsed,
            setSidebarCollapsed,
            searchQuery,
            setSearchQuery,
            user,
            navigate,
            showCreateModal,
            setShowCreateModal,
        }),
        [sidebarCollapsed, searchQuery, user, navigate, showCreateModal]
    );

    return (
        <div className="flex h-dvh overflow-hidden bg-appbg text-textpri">
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
                userName={user?.name}
                billingTier={user?.plan}
                avatarUrl={user?.avatar}
            />

            {/* Right column: topbar + content */}
            <div className="flex flex-1 flex-col min-w-0">
                {/* Topbar — in flex flow, NOT fixed */}
                <DashboardHeader
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    userName={user?.name}
                    billingTier={user?.plan}
                    avatarUrl={user?.avatar}
                    setShowModal={setShowCreateModal}
                    onToggleSidebar={toggleSidebar}
                    darkMode={darkMode}
                    onToggleDarkMode={toggleDarkMode}
                />

                {/* Main scrollable content area */}
                <main
                    className={`flex-1 min-h-0 bg-appbg ${isFullPageRoute ? 'overflow-hidden' : 'overflow-auto'}`}
                    aria-label="Dashboard content"
                >
                    {isFullPageRoute ? (
                        <Outlet context={outletCtx} />
                    ) : (
                        <div className="px-6 pt-6 pb-8 sm:px-8 sm:pt-8">
                            <Outlet context={outletCtx} />
                        </div>
                    )}
                </main>
            </div>

        </div>
    );
}
