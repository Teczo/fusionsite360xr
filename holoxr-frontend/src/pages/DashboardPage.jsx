// Split components for DashboardPage
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import DashboardHeader from '../components/DashboardHeader';
import DashboardPanel from '../components/DashboardPanel';

export default function DashboardPage() {
    const [projects, setProjects] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ name: '', description: '' });
    const [activeView, setActiveView] = useState('your-designs');
    const [openMenuId, setOpenMenuId] = useState(null);
    const [trashedProjects, setTrashedProjects] = useState([]);
    const [isCollapsed, setIsCollapsed] = useState(false);

    const token = localStorage.getItem('token');
    const navigate = useNavigate();

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const [user] = useState({ name: "Alex Johnson" }); // Replace with real user data later

    const fetchProjects = async () => {
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/projects`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (res.ok) setProjects(data);
        } catch (err) { console.error(err); }
    };

    const fetchTrashedProjects = async () => {
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/projects/trashed`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (res.ok) setTrashedProjects(data);
        } catch (err) { console.error(err); }
    };

    const handleCreate = async () => {
        if (!form.name || !form.description) return;
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/projects`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) return alert(data.error || 'Failed to create project');
            setProjects((prev) => [...prev, data]);
            setShowModal(false);
            navigate(`/studio?id=${data._id}`);
        } catch (err) { console.error(err); alert('Network error'); }
    };

    useEffect(() => {
        if (!token) return navigate('/signin');
        fetchProjects();
        fetchTrashedProjects();
    }, [token]);

    return (
        <div
            className="flex h-screen text-white bg-cover bg-center bg-[#18191e]"
            style={{ backgroundImage: "url('/images/dashboard-bg.png')" }}
        >
            <Sidebar
                isCollapsed={isCollapsed}
                setIsCollapsed={setIsCollapsed}
                activeView={activeView}
                setActiveView={setActiveView}
                setShowModal={setShowModal}
            />

            <div className={`flex-1 transition-all duration-300 ${isCollapsed ? 'pl-29' : 'pl-72'} pt-25 pr-4 pb-4`}>
                <div className="flex flex-col h-full">
                    <div className="absolute top-6 right-6">
                        <button
                            onClick={() => navigate('/profile')}
                            className="w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center text-white font-bold text-sm"
                            title="Profile Settings"
                        >
                            {user.name.charAt(0).toUpperCase()}
                        </button>
                    </div>

                    <DashboardHeader />
                    <DashboardPanel
                        activeView={activeView}
                        projects={projects}
                        trashedProjects={trashedProjects}
                        openMenuId={openMenuId}
                        setOpenMenuId={setOpenMenuId}
                        handleChange={handleChange}
                        handleCreate={handleCreate}
                        setProjects={setProjects}
                        setTrashedProjects={setTrashedProjects}
                    />
                </div>
            </div>
            {showModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-[#2c2e3a] border border-white/20 p-6 rounded-lg w-full max-w-md shadow-2xl text-white">
                        <h2 className="text-xl font-bold mb-4">Create New Project</h2>
                        <input
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            placeholder="Project Name"
                            className="w-full bg-[#18191e] border border-white/20 px-3 py-2 rounded mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <textarea
                            name="description"
                            value={form.description}
                            onChange={handleChange}
                            placeholder="Give your project a short description"
                            className="w-full bg-[#18191e] border border-white/20 px-3 py-2 rounded mb-4 h-24 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 bg-gray-600/50 hover:bg-gray-500/50 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreate}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
