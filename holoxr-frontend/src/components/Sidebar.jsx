// Sidebar.jsx
import { MoreHorizontal, Plus, LayoutGrid, Copy, Sparkles, Users2, NotepadTextDashed, ChartArea, Trash2 } from 'lucide-react';

export default function Sidebar({ isCollapsed, setIsCollapsed, activeView, setActiveView, setShowModal }) {
    const sidebarNavItems = [
        { label: 'Your Designs', key: 'your-designs', icon: LayoutGrid },
        { label: 'Templates', key: 'templates', icon: Copy },
        { label: 'MeshAI', key: 'meshai', icon: Sparkles },
    ];

    const sidebarManagementItems = [
        { icon: Users2, label: 'Team', key: 'team' },
        { icon: NotepadTextDashed, label: 'Experiences', key: 'experiences' },
        { icon: ChartArea, label: 'Analytics', key: 'analytics' },
        { icon: Trash2, label: 'Trash', key: 'trash' },
    ];

    return (
        <aside
            className={`
                ${isCollapsed ? 'w-20' : 'w-64'}
                bg-black/30 backdrop-blur-lg border border-white/10 shadow-xl
                fixed left-4 top-4 bottom-4 z-40 rounded-2xl p-4 flex flex-col transition-all duration-300
            `}
        >
            <div className="flex justify-end mb-6">
                <button onClick={() => setIsCollapsed(!isCollapsed)} className="bg-white/10 hover:bg-white/20 p-2 rounded transition">
                    <MoreHorizontal className="w-5 h-5 text-white" />
                </button>
            </div>

            {!isCollapsed && <div className="text-center py-2 mb-4"><h1 className="text-xl font-bold">HoloXR</h1></div>}

            <nav className="flex flex-col space-y-2 mb-4">
                {sidebarNavItems.map(({ label, key, icon: Icon }) => (
                    <button key={key} onClick={() => setActiveView(key)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-colors 
                            ${activeView === key ? 'bg-white/20 text-white' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}
                    >
                        <Icon className="w-5 h-5" />
                        {!isCollapsed && <span>{label}</span>}
                    </button>
                ))}
            </nav>

            <hr className="border-white/20 my-2" />

            <nav className="flex flex-col space-y-2">
                {sidebarManagementItems.map(({ label, key, icon: Icon }) => (
                    <button key={key} onClick={() => setActiveView(key)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-colors 
                            ${activeView === key ? 'bg-white/20 text-white' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}
                    >
                        <Icon className="w-5 h-5" />
                        {!isCollapsed && <span>{label}</span>}
                    </button>
                ))}
            </nav>

            <div className="mt-auto pt-4">
                <button onClick={() => setShowModal(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold transition-colors">
                    <Plus className="w-5 h-5" />
                    {!isCollapsed && <span>Create Project</span>}
                </button>
            </div>
        </aside>
    );
} 
