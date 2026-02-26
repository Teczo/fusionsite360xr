import { Search, Bell, Filter, Sun, Moon, ChevronRight } from "lucide-react";
import { useLocation } from "react-router-dom";

const ROUTE_LABELS = {
    "/dashboard/your-designs": "Workspace",
    "/dashboard/team":         "Team",
    "/dashboard/analytics":    "Analytics",
    "/dashboard/profile":      "Profile",
    "/dashboard/billing":      "Billing",
    "/digital-twin":           "Dashboard",
    "/twin":                   "Digital Twin",
    "/timeline":               "Timeline",
    "/hse":                    "HSE",
    "/files":                  "Files",
    "/ai":                     "AI Assistant",
};

export default function DashboardHeader({
    searchQuery,
    setSearchQuery,
    darkMode,
    onToggleDarkMode,
}) {
    const location = useLocation();
    const pageLabel = ROUTE_LABELS[location.pathname] ?? "Dashboard";
    const workspaceLabel = localStorage.getItem('workspace') || 'Workspace';

    return (
        <header className="h-16 bg-surface border-b border-border shadow-sm shrink-0 flex items-center justify-between px-4 sm:px-8 z-10">

            {/* Left: Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-sm min-w-0" aria-label="Breadcrumb">
                <span className="font-medium text-textsec">{workspaceLabel}</span>
                <ChevronRight className="w-3.5 h-3.5 text-texttert shrink-0" />
                <span className="font-semibold text-textpri">{pageLabel}</span>
            </nav>

            {/* Right: controls */}
            <div className="flex items-center gap-2 shrink-0">
                {/* Search — hidden on small screens */}
                <div className="relative hidden md:block">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textsec" />
                    <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search projects..."
                        className="w-52 rounded-lg bg-appbg border border-border px-4 pl-9 py-2 text-sm text-textpri placeholder:text-texttert outline-none focus:ring-2 focus:ring-[#2C97D4]/30 focus:border-[#2C97D4]/50 transition-all"
                    />
                </div>

                {/* Notification bell */}
                <button
                    className="p-2 rounded-lg text-textsec hover:text-textpri hover:bg-appbg transition-colors relative"
                    title="Notifications"
                >
                    <Bell className="w-[18px] h-[18px]" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full" />
                </button>

                {/* Divider before dark mode toggle */}
                <div className="w-px h-5 bg-border hidden sm:block" />

                {/* Dark / Light mode toggle */}
                <button
                    onClick={onToggleDarkMode}
                    className="p-2 rounded-lg text-textsec hover:text-textpri hover:bg-appbg transition-colors"
                    title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                    {darkMode
                        ? <Sun className="w-[18px] h-[18px]" />
                        : <Moon className="w-[18px] h-[18px]" />
                    }
                </button>

                {/* Divider before filter */}
                <div className="w-px h-5 bg-border hidden sm:block" />

                {/* Filter */}
                <button
                    className="p-2 rounded-lg text-textsec hover:text-textpri hover:bg-appbg transition-colors"
                    title="Filters"
                >
                    <Filter className="w-[18px] h-[18px]" />
                </button>
            </div>
        </header>
    );
}
