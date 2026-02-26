// components/dashboard/Sidebar.jsx
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
    LayoutGrid,
    Users2,
    ChartArea,
    User,
    Boxes,
    X,
    Clock,
    ShieldCheck,
    FolderOpen,
    Bot,
    MonitorSmartphone,
    LogOut,
    PanelLeftClose,
    PanelLeft,
    Globe,
    RefreshCw,
} from "lucide-react";

export default function Sidebar({
    sidebarOpen,
    setSidebarOpen,
    sidebarCollapsed,
    setSidebarCollapsed,
    isMobile,
    setShowModal,
    userName = "User",
    billingTier = "Free",
    avatarUrl,
}) {
    const navigate = useNavigate();
    const location = useLocation();

    // Detect projectId from URL query params
    const projectId = new URLSearchParams(location.search).get("id");

    // On mobile, the sidebar is always "expanded" (shows labels) inside the drawer
    const collapsed = isMobile ? false : sidebarCollapsed;

    // Workspace child routes — only built when inside a project
    const workspaceChildren = projectId
        ? [
              { label: "Dashboard",    path: `/digital-twin?id=${projectId}`, icon: LayoutGrid },
              { label: "Digital Twin", path: `/twin?id=${projectId}`,         icon: MonitorSmartphone },
              { label: "Timeline",     path: `/timeline?id=${projectId}`,     icon: Clock },
              { label: "HSE",          path: `/hse?id=${projectId}`,          icon: ShieldCheck },
              { label: "Files",        path: `/files?id=${projectId}`,        icon: FolderOpen },
              { label: "AI Assistant", path: `/ai?id=${projectId}`,           icon: Bot },
          ]
        : [];

    // Always-visible top-level items
    const globalItems = [
        { label: "Team",      path: "/dashboard/team",      icon: Users2 },
        { label: "Analytics", path: "/dashboard/analytics", icon: ChartArea },
    ];

    // Whether the current route belongs to Workspace
    const workspacePaths = ["/digital-twin", "/twin", "/timeline", "/hse", "/files", "/ai"];
    const isWorkspaceActive =
        workspacePaths.includes(location.pathname) ||
        location.pathname.startsWith("/dashboard/your-designs");

    // ES AppShell exact nav styles — colours from provided CSS spec
    // Active:   linear-gradient(to right, #2C97D4, #76C267) + shadow rgba(44,151,212,0.3)
    // Inactive: #475569 text, hover bg #f1f5f9, hover text #0f172a
    const baseItem = `w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-[150ms] ${collapsed ? "justify-center" : ""}`;
    const activeItem = "nav-item-active";
    const idleItem = "text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a]";
    const linkClass = ({ isActive }) => `${baseItem} ${isActive ? activeItem : idleItem}`;

    const initial = (userName || "").trim().charAt(0).toUpperCase() || "U";

    // --- Positioning classes ---
    const positionClasses = isMobile
        ? `fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`
        : `shrink-0 ${collapsed ? "w-16" : "w-64"} transition-all duration-300`;

    const workspaceName = localStorage.getItem('workspace')?.replace(' Workspace', '') || 'Workspace';

    const handleChangeWorkspace = () => {
        localStorage.removeItem('workspace');
        navigate('/workspace');
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        navigate("/signin");
    };

    return (
        <aside
            className={`${positionClasses} bg-surface border-r border-border flex flex-col shadow-lg z-20 overflow-hidden`}
        >
            {/* Logo + Brand + Collapse toggle */}
            <div className={`${collapsed ? "p-3 pb-0" : "p-6 pb-0"} flex-shrink-0`}>

                {/* Logo row */}
                <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3"} mb-6`}>
                    <img
                        src="/holo-icon.png"
                        alt="FusionXR Logo"
                        className={`${collapsed ? "h-8" : "h-10"} w-auto`}
                    />
                    {!collapsed && (
                        <span className="text-xl font-bold tracking-tight text-textpri" style={{ fontFamily: "'Syne', 'Inter', sans-serif" }}>
                            FusionXR
                        </span>
                    )}
                </div>

                {/* Collapse toggle — matches ES "Collapse / PanelLeftClose" row */}
                {isMobile ? (
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className={`w-full flex items-center ${collapsed ? "justify-center" : "justify-between"} px-3 py-2 text-xs font-medium text-textsec hover:text-textpri hover:bg-borderlight rounded-lg transition-colors`}
                        aria-label="Close sidebar"
                    >
                        {!collapsed && <span>Close</span>}
                        <X size={18} />
                    </button>
                ) : (
                    <button
                        onClick={() => setSidebarCollapsed(!collapsed)}
                        className={`w-full flex items-center ${collapsed ? "justify-center" : "justify-between"} px-3 py-2 text-xs font-medium text-textsec hover:text-textpri hover:bg-borderlight rounded-lg transition-colors`}
                        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                        aria-pressed={collapsed}
                        aria-label="Toggle Sidebar"
                    >
                        {!collapsed && <span>Collapse</span>}
                        {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
                    </button>
                )}
            </div>

            {/* Navigation */}
            <nav className={`flex-1 overflow-y-auto ${collapsed ? "px-2" : "px-4"} pb-6 flex flex-col gap-1`}>

                {/* CURRENT WORKSPACE block — ES style */}
                {!collapsed ? (
                    <>
                        <div className="mt-4 mb-4">
                            <div className="text-xs font-semibold text-texttert uppercase tracking-wider px-1 pb-2">
                                Current Workspace
                            </div>
                            {/* Workspace name row */}
                            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-appbg border border-border mb-2">
                                <Globe size={14} className="text-accent shrink-0" />
                                <span className="text-sm font-medium text-textpri truncate flex-1">{workspaceName}</span>
                            </div>
                            {/* Change Workspace button — solid green #76C267, ES style */}
                            <button
                                onClick={handleChangeWorkspace}
                                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
                                style={{ backgroundColor: '#76C267' }}
                            >
                                <RefreshCw size={12} />
                                Change Workspace
                            </button>
                        </div>
                        {/* Divider separating workspace block from nav items */}
                        <div className="border-t border-border mb-3" />
                    </>
                ) : (
                    <div className="mt-3 mb-3 flex justify-center">
                        <button
                            onClick={handleChangeWorkspace}
                            title={`${workspaceName} — Change Workspace`}
                            className="w-9 h-9 flex items-center justify-center rounded-lg text-textsec hover:text-textpri hover:bg-borderlight transition-colors"
                        >
                            <Globe size={16} />
                        </button>
                    </div>
                )}

                {projectId ? (
                    <>
                        {/* Workspace parent item */}
                        <div
                            className={`${baseItem} ${isWorkspaceActive ? activeItem : idleItem} cursor-default`}
                            title={collapsed ? "Workspace" : undefined}
                        >
                            <Boxes size={20} className="flex-shrink-0" />
                            {!collapsed && <span>Workspace</span>}
                        </div>

                        {/* Child routes — indented when expanded */}
                        {workspaceChildren.map(({ label, path, icon: Icon }) => {
                            const childPath = path.split("?")[0];
                            const isActive = location.pathname === childPath;
                            return (
                                <NavLink
                                    key={path}
                                    to={path}
                                    className={`${baseItem} ${isActive ? activeItem : idleItem} ${!collapsed ? "pl-10" : ""}`}
                                    title={collapsed ? label : undefined}
                                >
                                    <Icon size={18} className="flex-shrink-0" />
                                    {!collapsed && <span className="truncate">{label}</span>}
                                </NavLink>
                            );
                        })}
                    </>
                ) : (
                    <NavLink
                        to="/dashboard/your-designs"
                        className={linkClass}
                        title={collapsed ? "Dashboard" : undefined}
                    >
                        <LayoutGrid size={20} className="flex-shrink-0" />
                        {!collapsed && <span className="truncate">Dashboard</span>}
                    </NavLink>
                )}

                {/* GENERAL section label */}
                {!collapsed && (
                    <div className="text-xs font-semibold text-texttert uppercase tracking-wider px-1 pt-3 pb-1.5">
                        General
                    </div>
                )}
                {collapsed && <div className="my-2 border-t border-borderlight mx-1" />}

                {globalItems.map(({ label, path, icon: Icon }) => (
                    <NavLink
                        key={path}
                        to={path}
                        className={linkClass}
                        title={collapsed ? label : undefined}
                    >
                        <Icon size={20} className="flex-shrink-0" />
                        {!collapsed && <span className="truncate">{label}</span>}
                    </NavLink>
                ))}
            </nav>

            {/* Footer: profile + logout — matches ES AppShell bottom section exactly */}
            <div className={`mt-auto ${collapsed ? "p-3" : "p-6"} border-t border-border`}>
                {!collapsed ? (
                    <>
                        {/* Profile row */}
                        <button
                            onClick={() => navigate("/dashboard/profile")}
                            className="flex items-center gap-3 w-full mb-3 hover:bg-borderlight rounded-lg p-2 -mx-2 transition-colors"
                        >
                            {avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt={userName}
                                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-borderlight flex items-center justify-center flex-shrink-0">
                                    <User size={20} className="text-textsec" />
                                </div>
                            )}
                            <div className="flex-1 min-w-0 text-left">
                                <div className="text-sm font-medium text-textpri truncate">{userName}</div>
                                <div className="text-xs text-textsec truncate">{billingTier} plan</div>
                            </div>
                        </button>

                        {/* Logout button */}
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-textsec hover:text-white hover:bg-error border border-border hover:border-error rounded-lg transition-colors"
                        >
                            <LogOut size={14} />
                            Logout
                        </button>
                    </>
                ) : (
                    <div className="flex flex-col items-center gap-2">
                        {/* Avatar / profile icon */}
                        <button
                            onClick={() => navigate("/dashboard/profile")}
                            className="w-10 h-10 rounded-full bg-borderlight flex items-center justify-center hover:bg-border transition-colors"
                            title={`${userName} — ${billingTier} plan`}
                        >
                            {avatarUrl ? (
                                <img src={avatarUrl} alt={userName} className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                                <User size={20} className="text-textsec" />
                            )}
                        </button>

                        {/* Logout icon button */}
                        <button
                            onClick={handleLogout}
                            title="Logout"
                            className="w-10 h-10 flex items-center justify-center text-textsec hover:text-white hover:bg-error border border-border hover:border-error rounded-lg transition-colors"
                        >
                            <LogOut size={16} />
                        </button>
                    </div>
                )}
            </div>
        </aside>
    );
}
