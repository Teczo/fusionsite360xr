import { useState } from "react";
import { Search, Bell, SlidersHorizontal, Plus, Menu } from "lucide-react";

export default function DashboardHeader({
    searchQuery,
    setSearchQuery,
    user,
    setActiveView,
    setShowModal,
    onToggleSidebar,
}) {
    const [timeRange, setTimeRange] = useState("7d");

    return (
        <header className="w-full bg-white border-b border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] shrink-0">

            {/* Top row: breadcrumb + controls */}
            <div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-4">
                {/* Left: Toggle + Breadcrumb */}
                <div className="flex items-center gap-3 min-w-0">
                    {/* Sidebar toggle — visible on tablet & mobile only */}
                    {onToggleSidebar && (
                        <button
                            onClick={onToggleSidebar}
                            className="lg:hidden p-2 -ml-2 rounded-xl text-textsec hover:text-textpri hover:bg-gray-100 transition-colors"
                            aria-label="Toggle sidebar"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                    )}

                    <nav className="flex items-center gap-1.5 text-sm">
                        <span className="text-textsec font-medium">Workspace</span>
                    </nav>
                </div>

                {/* Right: controls */}
                <div className="flex items-center gap-2.5 shrink-0">
                    {/* Search — hidden on very small screens */}
                    <div className="relative hidden sm:block">
                        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textsec" />
                        <input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search projects..."
                            className="w-56 rounded-xl bg-gray-50 border border-gray-200 px-4 pl-9 py-2 text-sm text-textpri placeholder:text-textsec/60 outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand/40 transition-all"
                        />
                    </div>

                    {/* Notification bell */}
                    <button
                        className="p-2 rounded-xl text-textsec hover:text-textpri hover:bg-gray-100 transition-colors relative"
                        title="Notifications"
                    >
                        <Bell className="w-[18px] h-[18px]" />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full" />
                    </button>

                    {/* Filter */}
                    <button
                        className="p-2 rounded-xl text-textsec hover:text-textpri hover:bg-gray-100 transition-colors"
                        title="Filters"
                    >
                        <SlidersHorizontal className="w-[18px] h-[18px]" />
                    </button>

                    {/* Divider */}
                    <div className="w-px h-6 bg-gray-200 hidden sm:block" />

                    {/* Time range pills — hidden on small screens */}
                    <div className="hidden sm:flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                        <button
                            onClick={() => setTimeRange("7d")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${timeRange === "7d"
                                ? "bg-white text-textpri shadow-sm"
                                : "text-textsec hover:text-textpri"
                                }`}
                        >
                            Last 7 days
                        </button>
                        <button
                            onClick={() => setTimeRange("30d")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${timeRange === "30d"
                                ? "bg-white text-textpri shadow-sm"
                                : "text-textsec hover:text-textpri"
                                }`}
                        >
                            Last 30 days
                        </button>
                    </div>

                    {/* New Project CTA */}
                    {setShowModal && (
                        <button
                            onClick={() => setShowModal(true)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold btn-gradient-primary"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">New Project</span>
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
}
