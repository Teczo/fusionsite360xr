// DashboardPanel.jsx
import { MoreHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DashboardPanel({
    activeView,
    projects,
    trashedProjects,
    openMenuId,
    setOpenMenuId,
    handleChange,
    handleCreate,
    setProjects,
    setTrashedProjects
}) {
    const navigate = useNavigate();

    const handleDeleteProject = async (id) => {
        const confirm = window.confirm("Move this project to trash?");
        if (!confirm) return;
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/projects/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });
            if (res.ok) {
                alert("🗑 Project moved to trash");
                setProjects(prev => prev.filter(p => p._id !== id));
                setOpenMenuId(null);
            }
        } catch (err) {
            console.error("Delete error:", err);
        }
    };

    const handleRestoreProject = async (id) => {
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/projects/${id}/restore`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });
            if (res.ok) {
                alert("✅ Project restored");
                setTrashedProjects(prev => prev.filter(p => p._id !== id));
            }
        } catch (err) {
            console.error("Restore error:", err);
        }
    };

    const handlePermanentDelete = async (id) => {
        const confirm = window.confirm("This will permanently delete the project. Continue?");
        if (!confirm) return;
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/projects/${id}/permanent`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });
            if (res.ok) {
                alert("🗑 Project permanently deleted");
                setTrashedProjects(prev => prev.filter(p => p._id !== id));
            }
        } catch (err) {
            console.error("Permanent delete error:", err);
        }
    };

    return (
        <div className="flex-1 overflow-hidden">
            <div className="h-full bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6 overflow-y-auto">
                {activeView === 'your-designs' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {projects.map((proj) => (
                            <div key={proj._id} className="relative bg-[#2c2e3a]/80 rounded-lg shadow-lg hover:shadow-indigo-500/30 overflow-hidden h-64 group transition-all duration-300 hover:scale-105">
                                <button
                                    onClick={() => setOpenMenuId(openMenuId === proj._id ? null : proj._id)}
                                    className="absolute top-2 left-2 z-20 bg-black/50 rounded-full p-1.5 hover:bg-black/80 transition-colors"
                                >
                                    <MoreHorizontal className="w-4 h-4" />
                                </button>
                                <div onClick={() => navigate(`/studio?id=${proj._id}`)} className="cursor-pointer">
                                    <div className="h-36 bg-gray-500">
                                        <img src={proj.thumbnail || '/placeholder.png'} alt="thumb" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="p-3">
                                        <div className="font-bold truncate text-white">{proj.name}</div>
                                        <div className="text-xs text-gray-300 truncate">{proj.description}</div>
                                        <div className="text-xs text-gray-400 mt-1">{new Date(proj.updatedAt).toLocaleDateString()}</div>
                                    </div>
                                </div>
                                {openMenuId === proj._id && (
                                    <div className="absolute top-10 left-2 w-56 bg-neutral-900 text-white rounded-xl shadow-2xl z-30 text-sm animate-in fade-in zoom-in-95">
                                        <div className="p-3 border-b border-white/10">
                                            <div className="truncate font-medium">{proj.name}</div>
                                            <div className="text-white/70 text-xs mt-1">
                                                Created by You<br />
                                                {new Date(proj.createdAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <div className="p-2 space-y-1">
                                            <button className="w-full text-left px-3 py-1.5 hover:bg-white/10 rounded flex items-center gap-2" onClick={() => window.open(`/studio?id=${proj._id}`, '_blank')}>
                                                🔗 Open in New Tab
                                            </button>
                                            <button className="w-full text-left px-3 py-1.5 hover:bg-white/10 rounded flex items-center gap-2" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/studio?id=${proj._id}`)}>
                                                📤 Share
                                            </button>
                                            <button className="w-full text-left px-3 py-1.5 hover:bg-red-500/20 text-red-400 rounded flex items-center gap-2" onClick={() => handleDeleteProject(proj._id)}>
                                                🗑 Move to Trash
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {activeView === 'trash' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
                        {trashedProjects.map((proj) => (
                            <div key={proj._id} className="bg-[#2c2e3a]/80 rounded-lg shadow p-4 text-white relative flex flex-col justify-between">
                                <div>
                                    <div className="text-sm font-semibold truncate mb-1">{proj.name}</div>
                                    <div className="text-xs text-white/60 mb-1 line-clamp-2">{proj.description}</div>
                                    <div className="text-xs text-white/40">Deleted: {new Date(proj.deletedAt).toLocaleDateString()}</div>
                                </div>
                                <div className="mt-3 flex gap-2 text-xs">
                                    <button className="px-3 py-1 rounded bg-green-700 hover:bg-green-600 transition-colors" onClick={() => handleRestoreProject(proj._id)}>
                                        Restore
                                    </button>
                                    <button className="px-3 py-1 rounded bg-red-800 hover:bg-red-700 transition-colors" onClick={() => handlePermanentDelete(proj._id)}>
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                        {trashedProjects.length === 0 && <p className="text-gray-400 col-span-full text-center mt-10">Trash is empty.</p>}
                    </div>
                )}

                {(activeView === 'templates' || activeView === 'meshai' || activeView === 'team' || activeView === 'experiences' || activeView === 'analytics') && (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <h2 className="text-3xl font-bold capitalize">{activeView}</h2>
                            <p className="text-gray-400 mt-2">This feature is coming soon.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
} 
