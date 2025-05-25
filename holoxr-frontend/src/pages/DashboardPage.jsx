import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
    const [projects, setProjects] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ name: '', description: '' });
    const [filter, setFilter] = useState('all');
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
            if (!res.ok) {
                alert(data.error || 'Failed to create project');
                return;
            }

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
                else console.error(data.error || 'Failed to fetch');
            } catch (err) {
                console.error('Fetch error', err);
            }
        };

        fetchProjects();
    }, []);

    const filteredProjects = filter === 'all'
        ? projects
        : projects.filter(p => p.type === filter);

    return (
        <div className="flex h-screen bg-gray-50 text-gray-800">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r p-4 flex flex-col justify-between">
                <div>
                    <div className="text-xl font-bold mb-6">HoloXR</div>
                    <nav className="space-y-2">
                        {['Projects', 'Team', 'Experiences', 'Analytics', 'Billing', 'Trash'].map((item) => (
                            <button
                                key={item}
                                className="w-full text-left px-2 py-1 rounded font-medium bg-white hover:bg-gray-100 active:bg-gray-100"
                            >
                                {item}
                            </button>
                        ))}

                    </nav>
                </div>
                <div className="mt-6 text-sm text-gray-500">
                    <p>1 out of 5 projects</p>
                    <p className="text-orange-600 cursor-pointer hover:underline">Upgrade plan</p>
                </div>
            </aside>

            {/* Main */}
            <main className="flex-1 p-6 overflow-y-auto">
                {/* Topbar */}
                <div className="flex justify-between items-center mb-6">
                    <div className="text-xl font-semibold">Projects</div>
                    <div className="flex items-center gap-4">
                        <span className="text-gray-500">🔔 Notifications</span>
                        <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center font-bold">J</div>
                    </div>
                </div>

                {projects.length === 0 ? (
                    // Empty state
                    <div className="text-center mt-16">
                        <h2 className="text-3xl font-bold mb-2">Welcome to HoloXR!</h2>
                        <p className="text-gray-600 mb-6 max-w-xl mx-auto">
                            Welcome to our creative hub! Dive into our user-friendly platform and start crafting augmented reality projects that captivate and inspire.
                        </p>
                        <div className="flex justify-center">
                            <img src="/illustration-placeholder.png" alt="Illustration" className="w-96 mb-6" />
                        </div>
                        <button
                            onClick={() => setShowModal(true)}
                            className="px-5 py-2 bg-orange-500 text-white rounded font-medium"
                        >
                            + Let’s create
                        </button>
                    </div>
                ) : (
                    // Project grid
                    <>
                        <div className="flex items-center justify-between mb-4">
                            <div className="space-x-2">
                                <button onClick={() => setFilter('all')} className={`px-3 py-1 rounded-full ${filter === 'all' ? 'bg-gray-100' : 'bg-gray-200'}`}>All trackings</button>
                                <button onClick={() => setFilter('surface')} className={`px-3 py-1 rounded-full ${filter === 'surface' ? 'bg-gray-200' : 'bg-gray-200'}`}>Surface tracking</button>
                                <button onClick={() => setFilter('image')} className={`px-3 py-1 rounded-full ${filter === 'image' ? 'bg-gray-200' : 'bg-gray-200'}`}>Image tracking</button>
                            </div>
                            <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded">+ Create project</button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {filteredProjects.map((proj) => (
                                <div
                                    key={proj._id}
                                    onClick={() => navigate(`/studio?id=${proj._id}`)}
                                    className="bg-white rounded-lg shadow hover:shadow-lg cursor-pointer overflow-hidden"
                                >
                                    <div className="h-36 bg-gray-200">
                                        {/* Replace with actual thumbnail */}
                                        <img src={proj.thumbnail || '/placeholder.png'} className="object-cover w-full h-full" />
                                    </div>
                                    <div className="p-3">
                                        <div className={`text-xs font-semibold mb-1 ${proj.type === 'surface' ? 'text-purple-600' : 'text-green-600'}`}>
                                            {proj.type?.toUpperCase() || 'UNKNOWN'}
                                        </div>
                                        <div className="font-medium text-sm">{proj.name}</div>
                                        <div className="text-xs text-gray-500">Modified {new Date(proj.updatedAt).toLocaleString()}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </main>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
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
