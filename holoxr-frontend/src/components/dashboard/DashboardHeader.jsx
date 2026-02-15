import { useState } from "react";
import { Search, Bell, SlidersHorizontal, Plus } from "lucide-react";

export default function DashboardHeader({
    searchQuery,
    setSearchQuery,
    theme,
    setTheme,
    user,
    setActiveView,
    setShowModal,
}) {
    const [timeRange, setTimeRange] = useState("7d");

    return (
        <header className="w-full">
            {/* Top row: breadcrumb + controls */}
            <div className="flex items-center justify-between gap-4">
                {/* Left: Breadcrumb */}
                <div className="flex items-center gap-2 min-w-0">
                    <nav className="flex items-center gap-1.5 text-sm">
                        <span className="text-textsec font-medium">Workspace</span>
                        <span className="text-textsec/50">/</span>
                        <span className="text-textpri font-semibold">Dashboard</span>
                    </nav>
                </div>

                {/* Right: controls */}
                <div className="flex items-center gap-2.5 shrink-0">
                    {/* Search */}
                    <div className="relative">
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
                    <div className="w-px h-6 bg-gray-200" />

                    {/* Time range pills */}
                    <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
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
                            New Project
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
}
