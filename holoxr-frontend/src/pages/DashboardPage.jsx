import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BookOpen, FlaskConical, Paintbrush, Brain, UploadCloud, MoreHorizontal, Plus
} from 'lucide-react';

export default function DashboardPage() {
    const [projects, setProjects] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ name: '', description: '' });
    const [filter, setFilter] = useState('your-designs');
    const navigate = useNavigate();

    const token = localStorage.getItem('token');

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
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
        } catch (err) {
            console.error(err);
            alert('Network error');
        }
    };

    useEffect(() => {
        if (!token) return navigate('/signin');
        const fetchProjects = async () => {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/api/projects`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await res.json();
                if (res.ok) setProjects(data);
            } catch (err) {
                console.error('Fetch error', err);
            }
        };
        fetchProjects();
    }, []);

    return (
        <div className="flex h-screen bg-[#18191e] text-gray-800">
            {/* Sidebar */}
            <aside className="w-20 bg-[#18191e] border-r p-2 flex flex-col items-center space-y-4 mt-6">
                <button
                    onClick={() => setShowModal(true)}
                    className="flex flex-col items-center text-[10px] text-white"
                    title="Create Project"
                >
                    <div
                        className="w-10 h-10 flex items-center justify-center bg-transparent hover:bg-white/50 rounded-full transition-colors duration-200"
                    >
                        <Plus className="w-5 h-5 text-white" />
                    </div>
                    <span className="mt-2">Create</span>
                </button>

                {[
                    { icon: BookOpen, label: 'Projects' },
                    { icon: FlaskConical, label: 'Team' },
                    { icon: Paintbrush, label: 'Experiences' },
                    { icon: Brain, label: 'Analytics' },
                ].map(({ icon: Icon, label }) => (
                    <button key={label} className="flex flex-col items-center text-[12px] text-white">
                        <div
                            className="w-10 h-10 flex items-center justify-center bg-transparent hover:bg-white/50 rounded-full transition-colors duration-200"
                        >
                            <Icon className="w-6 h-6 text-white" />
                        </div>
                        <span className="mt-2">{label}</span>
                    </button>
                ))}
            </aside>

            {/* Main */}
            <main
                className="flex-1 flex justify-center overflow-y-auto bg-cover bg-center"
                style={{ backgroundImage: "url('/images/dashboard-bg.jpg')" }}
            >

                <div className="max-w-8xl w-full p-6">
                    <div className="mb-4">
                        <h1 className="text-lg font-semibold mb-4 text-center text-white mt-10">
                            What AR world will you create today?
                        </h1>
                        <div className="flex justify-center gap-2 mb-4">
                            {[
                                { label: 'Your Designs', key: 'your-designs' },
                                { label: 'Templates', key: 'templates' },
                                { label: 'MeshAI', key: 'meshai' },
                            ].map(({ label, key }) => (
                                <button
                                    key={key}
                                    onClick={() => setFilter(key)}
                                    className={`px-4 py-2 rounded-full text-sm font-semibold ${filter === key ? 'bg-black text-white' : 'bg-gray-200'}`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        <div className="px-4 py-2 flex justify-center">
                            <input
                                type="text"
                                placeholder="Search or prompt MeshAI..."
                                className="w-200 max-w-full h-20 bg-opacity border rounded-2xl px-4 py-2 mb-4 text-white placeholder-white shadow hover:shadow-[0_0_20px_2px_rgba(38,71,107,1)]"
                            />
                        </div>

                        <div className="flex justify-center gap-4 mb-6">
                            {[
                                { icon: BookOpen, label: 'Biology' },
                                { icon: FlaskConical, label: 'Chemistry' },
                                { icon: Paintbrush, label: 'Art' },
                                { icon: Brain, label: 'Quiz' },
                                { icon: UploadCloud, label: 'Upload' },
                                { icon: MoreHorizontal, label: 'More' },
                            ].map(({ icon: Icon, label }) => {
                                // Array of Tailwind background color classes
                                const colorClasses = [
                                    'bg-red-500',
                                    'bg-blue-500',
                                    'bg-yellow-500',
                                    'bg-green-500',
                                    'bg-purple-500',
                                    'bg-pink-500',
                                ];
                                // Randomly select a color
                                const randomColor = colorClasses[Math.floor(Math.random() * colorClasses.length)];

                                return (
                                    <div key={label} className="flex flex-col items-center text-sm cursor-pointer">
                                        <div
                                            className={`flex items-center justify-center w-16 h-16 rounded-full ${randomColor} text-white hover:scale-110 transition-transform duration-200`}
                                        >
                                            <Icon className="w-6 h-6 text-white" />
                                        </div>
                                        <span className="mt-2 text-white">{label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Project Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
                        {projects.map((proj) => (
                            <div
                                key={proj._id}
                                onClick={() => navigate(`/studio?id=${proj._id}`)}
                                className="bg-[#2c2e3a] rounded-lg shadow hover:shadow-[0_0_20px_8px_rgba(1,1,1,1)] cursor-pointer overflow-hidden h-64" // Adjusted height for rectangular shape
                            >
                                <div className="h-36 bg-gray-200">
                                    <img
                                        src={proj.thumbnail || '/placeholder.png'}
                                        alt="thumb"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="p-3">
                                    <div className="text-sm font-medium truncate text-white">{proj.name}</div>
                                    <div className="text-xs text-white truncate">{proj.description}</div>
                                    <div className="text-xs text-white mt-1">{new Date(proj.updatedAt).toLocaleDateString()}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {/* Create Project Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded w-full max-w-md shadow-lg">
                        <h2 className="text-xl font-bold mb-4">Create Project</h2>
                        <input
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            placeholder="Project Name"
                            className="w-full border px-3 py-2 rounded mb-3"
                        />
                        <textarea
                            name="description"
                            value={form.description}
                            onChange={handleChange}
                            placeholder="Description"
                            className="w-full border px-3 py-2 rounded mb-3"
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-300 rounded">Cancel</button>
                            <button onClick={handleCreate} className="px-4 py-2 bg-green-600 text-white rounded">Create</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
