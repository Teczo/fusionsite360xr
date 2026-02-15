// components/dashboard/Sidebar.jsx
import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
    ChevronsLeft,
    ChevronsRight,
    Plus,
    LayoutGrid,
    FileText,
    FolderKanban,
    Package,
    Users2,
    ChartArea,
    User,
    CreditCard,
    Boxes,
    Copy,
    Sparkles,
    LogOut,
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

    // hydrate + cross-tab sync
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
            title: "Main",
            items: [
                { label: "Dashboard", key: "your-designs", icon: LayoutGrid },
                { label: "Digital Twin", key: "digital-twin", icon: Boxes },
                { label: "Doc Management", key: "templates", icon: FileText },
                { label: "Project Mgmt", key: "meshai", icon: FolderKanban },
                { label: "Asset Mgmt", key: "experiences", icon: Package },
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

    const baseItem =
        "flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200";
    const activeItem = "bg-brand-50 text-brand";
    const idleItem = "text-textsec hover:bg-gray-50 hover:text-textpri";
    const linkClass = ({ isActive }) =>
        `${baseItem} ${isActive ? activeItem : idleItem}`;

    const initial = (userName || "").trim().charAt(0).toUpperCase() || "U";

    return (
        <aside
            className={`
                ${isCollapsed ? "w-[72px]" : "w-[260px]"}
                bg-white border-r border-gray-200 shadow-[2px_0_12px_rgba(0,0,0,0.04)]
                fixed left-0 top-0 bottom-0 z-40
                flex flex-col transition-all duration-300
                text-textpri
            `}
        >
            {/* Header */}
            <div
                className={`flex items-center justify-between px-4 pt-5 pb-3 ${isCollapsed ? "justify-center group relative" : ""}`}
            >
                <div className="flex items-center gap-2.5">
                    <img
                        src="/holo-icon.png"
                        alt="HoloXR Logo"
                        className="w-8 h-8"
                    />
                    {!isCollapsed && (
                        <span className="text-base font-bold text-textpri tracking-tight">
                            FusionXR
                        </span>
                    )}
                </div>

                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className={`p-1.5 rounded-lg transition-all
                        text-textsec hover:text-textpri hover:bg-gray-100
                        ${isCollapsed ? "absolute right-1 top-5 opacity-0 group-hover:opacity-100" : ""}
                    `}
                    title={
                        isCollapsed ? "Expand sidebar (⌘/Ctrl+B)" : "Collapse sidebar (⌘/Ctrl+B)"
                    }
                    aria-pressed={isCollapsed}
                    aria-label="Toggle Sidebar"
                >
                    {isCollapsed ? (
                        <ChevronsRight className="w-4 h-4" />
                    ) : (
                        <ChevronsLeft className="w-4 h-4" />
                    )}
                </button>
            </div>

            {/* Create CTA */}
            <div className="px-3 mb-2">
                <button
                    onClick={() => setShowModal(true)}
                    className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-semibold text-sm btn-gradient-primary ${isCollapsed ? "px-0" : ""}`}
                >
                    <Plus className="w-4 h-4" />
                    {!isCollapsed && <span>New Project</span>}
                </button>
            </div>

            <hr className="border-gray-100 mx-3 my-1" />

            {/* Nav */}
            <nav className="mt-1 flex-1 overflow-y-auto px-3">
                {sections.map(({ title, items }) => (
                    <div key={title} className="flex flex-col gap-0.5 mb-5">
                        {!isCollapsed && (
                            <div className="px-3 py-2 text-[11px] uppercase tracking-widest text-textsec font-semibold">
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
                                <Icon className="w-[18px] h-[18px] shrink-0" />
                                {!isCollapsed && <span>{label}</span>}
                            </NavLink>
                        ))}
                    </div>
                ))}
            </nav>

            {/* Bottom: profile row */}
            <div ref={profileRef} className="mt-auto px-3 pb-4 pt-2 relative border-t border-gray-100">
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
                            className="w-8 h-8 rounded-full object-cover"
                        />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-brand text-white grid place-items-center text-sm font-semibold shrink-0">
                            {initial}
                        </div>
                    )}
                    {!isCollapsed && (
                        <div className="flex flex-col leading-tight text-left">
                            <span className="font-medium text-textpri text-sm">{userName}</span>
                            <span className="text-[11px] text-textsec">{billingTier} plan</span>
                        </div>
                    )}
                </button>

                {menuOpen && (
                    <div
                        role="menu"
                        className={`absolute z-50 ${isCollapsed ? "left-full ml-2 bottom-1" : "left-2 right-2 bottom-[72px]"
                            } bg-white border border-gray-200 rounded-xl shadow-lg p-1.5`}
                    >
                        <button
                            role="menuitem"
                            onClick={() => {
                                setMenuOpen(false);
                                navigate("/dashboard/profile");
                            }}
                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-sm flex items-center gap-2.5 text-textpri"
                        >
                            <User className="w-4 h-4 text-textsec" />
                            View Profile
                        </button>
                        <button
                            role="menuitem"
                            onClick={() => {
                                setMenuOpen(false);
                                navigate("/dashboard/billing");
                            }}
                            className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-sm flex items-center gap-2.5 text-textpri"
                        >
                            <CreditCard className="w-4 h-4 text-textsec" />
                            Billing &amp; Plan
                        </button>
                    </div>
                )}
            </div>
        </aside>
    );
}
