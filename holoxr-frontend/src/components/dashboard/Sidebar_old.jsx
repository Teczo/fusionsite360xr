import { useEffect } from "react";
import {
    MoreHorizontal,
    Plus,
    LayoutGrid,
    Copy,
    Sparkles,
    Users2,
    NotepadTextDashed,
    ChartArea,
    Trash2,
    CreditCard,
} from "lucide-react";

const STORAGE_KEY = "ui.sidebar.collapsed";

export default function Sidebar({
    isCollapsed,
    setIsCollapsed,
    activeView,
    setActiveView,
    setShowModal,
}) {
    // 1) Hydrate from localStorage on mount
    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw !== null) setIsCollapsed(raw === "1");
        } catch { }
        // 2) Cross-tab sync
        const onStorage = (e) => {
            if (e.key === STORAGE_KEY && e.newValue != null) {
                setIsCollapsed(e.newValue === "1");
            }
        };
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, [setIsCollapsed]);

    // 3) Persist whenever it changes
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, isCollapsed ? "1" : "0");
        } catch { }
    }, [isCollapsed]);

    // 4) Keyboard shortcut (Cmd/Ctrl + B) to toggle
    useEffect(() => {
        const onKey = (e) => {
            const isMeta = navigator.platform.includes("Mac") ? e.metaKey : e.ctrlKey;
            if (isMeta && e.key.toLowerCase() === "b") {
                e.preventDefault();
                setIsCollapsed((prev) => !prev);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [setIsCollapsed]);

    const sidebarNavItems = [
        { label: "Your Designs", key: "your-designs", icon: LayoutGrid },
        { label: "Templates", key: "templates", icon: Copy },
        { label: "MeshAI", key: "meshai", icon: Sparkles },
    ];

    const sidebarManagementItems = [
        { icon: Users2, label: "Team", key: "team" },
        { icon: NotepadTextDashed, label: "Experiences", key: "experiences" },
        { icon: ChartArea, label: "Analytics", key: "analytics" },
        { icon: CreditCard, label: "Billing", key: "billing" },
        { icon: Trash2, label: "Trash", key: "trash" },
    ];

    const sections = [
        { title: "Browse", items: sidebarNavItems },
        { title: "Manage", items: sidebarManagementItems },
    ];

    const baseItem =
        "flex items-center gap-3 w-full rounded-xl px-3 py-2 text-sm transition-colors";
    const activeItem = "bg-brand/10 text-brand border border-brand/30";
    const idleItem = "text-textsec hover:bg-surface/70 hover:text-textpri";

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
            {/* Header */}
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
                    title={isCollapsed ? "Expand sidebar (⌘/Ctrl+B)" : "Collapse sidebar (⌘/Ctrl+B)"}
                    aria-pressed={isCollapsed}
                    aria-label="Toggle Sidebar"
                >
                    <MoreHorizontal className="w-5 h-5 text-textpri" />
                </button>
            </div>

            <hr className="border-white/10 my-2" />

            {/* Nav */}
            <nav className="mt-2 flex-1 overflow-y-auto">
                {sections.map(({ title, items }) => (
                    <div key={title} className="flex flex-col space-y-2 mb-8">
                        {!isCollapsed && (
                            <div className="px-2 py-1 text-[11px] uppercase tracking-wider text-textsec">
                                {title}
                            </div>
                        )}

                        {items.map(({ label, key, icon: Icon }) => (
                            <button
                                key={key}
                                onClick={() => setActiveView(key)}
                                className={`${baseItem} ${activeView === key ? activeItem : idleItem
                                    }`}
                                title={isCollapsed ? label : undefined}
                            >
                                <Icon className="w-5 h-5" />
                                {!isCollapsed && <span>{label}</span>}
                            </button>
                        ))}
                    </div>
                ))}
            </nav>

            {/* CTA */}
            <div className="mt-auto pt-4">
                <button
                    onClick={() => setShowModal(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors bg-brand/10 hover:bg-brand-600 text-brand"
                >
                    <Plus className="w-5 h-5" />
                    {!isCollapsed && <span>Create Project</span>}
                </button>
            </div>

            <div className="p-2 text-xs text-textsec text-center">v1.0</div>
        </aside>
    );
}
