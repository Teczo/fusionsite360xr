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

    const sections = [
        {
            title: 'Browse',
            items: [
                { key: 'your-designs', label: 'Your Designs', icon: LayoutGrid },
                { key: 'templates', label: 'Templates', icon: Copy },
                { key: 'meshai', label: 'MeshAI', icon: Sparkles },
            ],
        },
        {
            title: 'Manage',
            items: [
                { key: 'team', label: 'Team', icon: Users2 },
                { key: 'experiences', label: 'Experiences', icon: NotepadTextDashed },
                { key: 'analytics', label: 'Analytics', icon: ChartArea },
                { key: 'trash', label: 'Trash', icon: Trash2 },
            ],
        },
    ];


    return (
        <aside
            className={`
                ${isCollapsed ? 'w-20' : 'w-64'}
                bg-black/30 backdrop-blur-lg border border-white/10 shadow-xl
                fixed left-4 top-4 bottom-4 z-40 rounded-2xl p-4 flex flex-col transition-all duration-300
            `}
        >
            <div className={`flex items-center justify-between mb-6 ${isCollapsed ? 'justify-center group relative' : ''}`}>
                <img
                    src="/holo-icon.png"
                    alt="HoloXR Logo"
                    className={`w-8 h-8 ${isCollapsed ? '' : 'ml-1'}`}
                />


                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className={`bg-white/10 hover:bg-white/20 p-2 rounded transition ${isCollapsed ? 'absolute right-0 opacity-0 group-hover:opacity-100' : ''
                        }`}
                    title="Toggle Sidebar"
                >
                    <MoreHorizontal className="w-5 h-5 text-white" />
                </button>
            </div>





            <hr className="border-white/20 my-2" />




            <nav className="mt-2 flex-1 overflow-y-auto ">
                <div className="flex flex-col space-y-2 mb-8">
                    {!isCollapsed && (
                        <div className="px-2 py-1 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Browse
                        </div>
                    )}
                    {sidebarNavItems.map(({ label, key, icon: Icon }) => (

                        <button key={key} onClick={() => setActiveView(key)}
                            className={`flex items-center gap-3 w-full rounded-xl px-3 py-2 text-sm
                            ${activeView === key ? 'bg-indigo-600/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}
                        >
                            <Icon className="w-5 h-5" />
                            {!isCollapsed && <span>{label}</span>}
                        </button>
                    ))}
                </div>

                <div className="flex flex-col space-y-2">
                    {!isCollapsed && (
                        <div className="px-2 py-1 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Manage
                        </div>
                    )}
                    {sidebarManagementItems.map(({ label, key, icon: Icon }) => (
                        <button key={key} onClick={() => setActiveView(key)}
                            className={`flex items-center gap-3 w-full rounded-xl px-3 py-2 text-sm
                            ${activeView === key ? 'bg-indigo-600/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}
                        >
                            <Icon className="w-5 h-5" />
                            {!isCollapsed && <span>{label}</span>}
                        </button>
                    ))}
                </div>

            </nav>


            <div className="mt-auto pt-4">
                <button onClick={() => setShowModal(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold transition-colors">
                    <Plus className="w-5 h-5" />
                    {!isCollapsed && <span>Create Project</span>}
                </button>
            </div>

            <div className="p-2 text-xs text-slate-500 dark:text-slate-400 text-center">v1.0</div>
        </aside>
    );
}
