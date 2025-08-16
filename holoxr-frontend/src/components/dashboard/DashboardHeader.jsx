import { Sun, Moon, User } from 'lucide-react';

export default function DashboardHeader({ searchQuery, setSearchQuery, theme, setTheme, user, setActiveView }) {
    const initials = user?.name
        ? user.name
            .split(' ')
            .map((s) => s[0])
            .slice(0, 2)
            .join('')
            .toUpperCase()
        : 'U';

    return (
        <header className="w-full">
            <div className="flex items-center gap-3">
                {/* Search */}
                <div className="flex-1">
                    <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search your projects or prompt MeshAI..."
                        className="w-full rounded-xl bg-white/80 dark:bg-white/10 border border-slate-300/70 dark:border-white/10
                       px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400"
                    />
                </div>

                {/* Theme toggle 
                <button
                    className="rounded-xl border border-slate-300/70 dark:border-white/10 bg-white/80 dark:bg-white/10 p-2 hover:bg-black/5 dark:hover:bg-white/15"
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                    {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                </button>*/}


                <button
                    key={'profile'}
                    onClick={() => setActiveView('profile')}
                    className="relative inline-flex items-center justify-center w-9 h-9 rounded-full bg-indigo-600 text-white select-none"
                    title="Profile"
                >
                    <span className="text-xs font-semibold">{initials}</span>
                </button>
            </div>
        </header>
    );
}