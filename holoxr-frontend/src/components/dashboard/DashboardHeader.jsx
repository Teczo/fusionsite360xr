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

                {/* Theme toggle */}
                {typeof theme !== "undefined" && typeof setTheme === "function" && (
                    <button
                        className="rounded-xl border border-white/10 bg-surface/70 hover:bg-surface/90 p-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
                        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                        title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                        aria-label="Toggle color theme"
                    >
                        {theme === "dark" ? (
                            <Sun className="w-4 h-4 text-title" />
                        ) : (
                            <Moon className="w-4 h-4 text-title" />
                        )}
                    </button>
                )}

                {/* Profile */}
                <button
                    onClick={() => setActiveView("profile")}
                    className="relative inline-flex items-center justify-center w-9 h-9 rounded-full bg-brand hover:bg-brand-600 text-black font-semibold transition-colors ring-1 ring-brand/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60"
                    title="Profile"
                    aria-label="Open profile"
                >
                    <span className="text-xs">{initials}</span>
                </button>
            </div>
        </header>
    );
}
