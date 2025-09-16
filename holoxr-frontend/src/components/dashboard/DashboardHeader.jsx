import { Sun, Moon, Search } from "lucide-react";

export default function DashboardHeader({
    searchQuery,
    setSearchQuery,
    theme,
    setTheme,
    user,
    setActiveView,
}) {
    const initials = user?.name
        ? user.name
            .split(" ")
            .map((s) => s[0])
            .slice(0, 2)
            .join("")
            .toUpperCase()
        : "U";

    return (
        <header className="w-full">
            <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-textsec" />
                    <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search your projects or prompt MeshAI..."
                        className="w-full rounded-xl bg-surface/80 border border-white/10 px-4 pl-9 py-2 text-sm text-title placeholder:text-textsec/70 outline-none focus:ring-2 focus:ring-brand/60 shadow-inner"
                    />
                </div>




            </div>
        </header>
    );
}
