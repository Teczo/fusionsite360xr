// components/dashboard/Sidebar.jsx
import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
    ChevronsLeft,
    ChevronsRight,
    Plus,
    LayoutGrid,
    Copy,
    Sparkles,
    Users2,
    ChartArea,
    User,
    CreditCard,
} from "lucide-react";

const STORAGE_KEY = "ui.sidebar.collapsed";

export default function Sidebar({
    isCollapsed,
    setIsCollapsed,
    setShowModal,
    userName = "User",
    billingTier = "Free",
    avatarUrl,
}) {
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const profileRef = useRef(null);

    // hydrate + cross-tab sync (same mechanism as your old sidebar)
    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw !== null) setIsCollapsed(raw === "1");
        } catch { }
        const onStorage = (e) => {
            if (e.key === STORAGE_KEY && e.newValue != null) {
                setIsCollapsed(e.newValue === "1");
            }
        };
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, [setIsCollapsed]);

    // persist
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, isCollapsed ? "1" : "0");
        } catch { }
    }, [isCollapsed]);

    // keyboard shortcut
    useEffect(() => {
        const onKey = (e) => {
            const isMeta = navigator.platform.includes("Mac") ? e.metaKey : e.ctrlKey;
            if (isMeta && e.key.toLowerCase() === "b") {
                e.preventDefault();
                setIsCollapsed((p) => !p);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [setIsCollapsed]);

    // close profile menu on outside click
    useEffect(() => {
        const onDocClick = (e) => {
            if (!profileRef.current) return;
            if (!profileRef.current.contains(e.target)) setMenuOpen(false);
        };
        document.addEventListener("mousedown", onDocClick);
        return () => document.removeEventListener("mousedown", onDocClick);
    }, []);

    const sections = [
        {
            title: "Browse",
            items: [
                { label: "Your Designs", key: "your-designs", icon: LayoutGrid },
                { label: "Templates", key: "templates", icon: Copy },
                { label: "MeshAI", key: "meshai", icon: Sparkles },
            ],
        },
        {
            title: "Manage",
            items: [
                { label: "Team", key: "team", icon: Users2 },
                { label: "Analytics", key: "analytics", icon: ChartArea },
            ],
        },
    ];

    // keep your original tokens
    const baseItem =
        "flex items-center gap-3 w-full rounded-xl px-3 py-2 text-sm transition-colors";
    const activeItem = "bg-brand/10 text-brand border border-brand/30";
    const idleItem = "text-textsec hover:bg-surface/70 hover:text-textpri";
    const linkClass = ({ isActive }) =>
        `${baseItem} ${isActive ? activeItem : idleItem}`;

    const initial = (userName || "").trim().charAt(0).toUpperCase() || "U";

    return (
        <aside
            className={`
        ${isCollapsed ? "w-20" : "w-64"}
        bg-black/30 backdrop-blur-lg border border-white/10 shadow-xl
        fixed left-4 top-4 bottom-4 z-40 rounded-2xl p-4
        flex flex-col transition-all duration-300
        text-textpri
      `}
        >
            {/* Header (FOLLOWING OLD MECHANISM; only icon changed) */}
            <div
                className={`flex items-center justify-between mb-6 ${isCollapsed ? "justify-center group relative" : ""
                    }`}
            >
                <img
                    src="/holo-icon.png"
                    alt="HoloXR Logo"
                    className={`w-8 h-8 ${isCollapsed ? "" : "ml-1"}`}
                />

                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className={`p-2 rounded transition
            bg-surface/60 hover:bg-surface/80
            ring-1 ring-white/10 hover:ring-brand/40
            ${isCollapsed ? "absolute right-0 opacity-0 group-hover:opacity-100" : ""}
          `}
                    title={
                        isCollapsed ? "Expand sidebar (⌘/Ctrl+B)" : "Collapse sidebar (⌘/Ctrl+B)"
                    }
                    aria-pressed={isCollapsed}
                    aria-label="Toggle Sidebar"
                >
                    {isCollapsed ? (
                        <ChevronsRight className="w-5 h-5 text-textpri" />
                    ) : (
                        <ChevronsLeft className="w-5 h-5 text-textpri" />
                    )}
                </button>
            </div>

            <hr className="border-white/10 my-2" />

            {/* Nav */}
            <nav className="mt-2 flex-1 overflow-y-auto">
                {/* Create CTA (with a bit more gap above) */}
                <div className="mt-3 mb-4">
                    <button
                        onClick={() => setShowModal(true)}
                        // BEFORE
                        // className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors bg-brand hover:bg-brand-600 text-black"

                        // AFTER
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold btn-gradient-primary"
                    >
                        <Plus className="w-5 h-5" />
                        {!isCollapsed && <span>Create Project</span>}
                    </button>
                </div>

                {sections.map(({ title, items }) => (
                    <div key={title} className="flex flex-col space-y-2 mb-8">
                        {!isCollapsed && (
                            <div className="px-2 py-1 text-[11px] uppercase tracking-wider text-textsec">
                                {title}
                            </div>
                        )}

                        {items.map(({ label, key, icon: Icon }) => (
                            <NavLink
                                key={key}
                                to={`/dashboard/${key}`}
                                className={linkClass}
                                title={isCollapsed ? label : undefined}
                                onClick={() => setMenuOpen(false)}
                            >
                                <Icon className="w-5 h-5" />
                                {!isCollapsed && <span>{label}</span>}
                            </NavLink>
                        ))}
                    </div>
                ))}
            </nav>

            {/* Bottom: profile row (same design, click to open menu) */}
            <div ref={profileRef} className="mt-auto pt-2 relative">
                <button
                    onClick={() => setMenuOpen((v) => !v)}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    className={`${baseItem} ${idleItem}`}
                    title={isCollapsed ? "Profile" : undefined}
                >
                    {avatarUrl ? (
                        <img
                            src={avatarUrl}
                            alt={userName}
                            className="w-7 h-7 rounded-full object-cover"
                        />
                    ) : (
                        <div className="w-7 h-7 rounded-full bg-brand text-white grid place-items-center text-sm font-semibold">
                            {initial}
                        </div>
                    )}
                    {!isCollapsed && (
                        <div className="flex flex-col leading-tight text-left">
                            <span className="font-medium text-title">{userName}</span>
                            <span className="text-[11px] text-textsec">{billingTier}</span>
                        </div>
                    )}
                </button>

                {menuOpen && (
                    <div
                        role="menu"
                        className={`absolute z-50 ${isCollapsed ? "left-full ml-2 bottom-1" : "left-2 right-2 bottom-14"
                            } bg-surface/95 border border-white/10 rounded-xl shadow-2xl p-2`}
                    >
                        <button
                            role="menuitem"
                            onClick={() => {
                                setMenuOpen(false);
                                navigate("/dashboard/profile");
                            }}
                            className="w-full text-left px-3 py-1.5 rounded hover:bg-white/10 text-sm flex items-center gap-2"
                        >
                            <User className="w-4 h-4" />
                            View Profile
                        </button>
                        <button
                            role="menuitem"
                            onClick={() => {
                                setMenuOpen(false);
                                navigate("/dashboard/billing");
                            }}
                            className="w-full text-left px-3 py-1.5 rounded hover:bg-white/10 text-sm flex items-center gap-2"
                        >
                            <CreditCard className="w-4 h-4" />
                            Billing &amp; Plan
                        </button>
                    </div>
                )}
            </div>
        </aside>
    );
}
