import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
    const [projects, setProjects] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ name: '', description: '' });
    const navigate = useNavigate();

    const token = localStorage.getItem('token');

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleCreate = async () => {
        if (!form.name || !form.description) return;

        const token = localStorage.getItem('token');
        try {
            const res = await fetch('http://localhost:4000/api/projects', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: form.name,
                    description: form.description,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                alert(data.error || 'Failed to create project');
                return;
            }

            // Optionally add to list
            setProjects((prev) => [...prev, data]);
            setShowModal(false);

            // Navigate to Studio with project ID
            navigate(`/studio?id=${data._id}`);
        } catch (err) {
            console.error(err);
            alert('Network error while creating project');
        }
    };


    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/signin');
            return;
        }

        const fetchProjects = async () => {
            try {
                const res = await fetch('http://localhost:4000/api/projects', {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                const data = await res.json();
                if (res.ok) {
                    setProjects(data);
                } else {
                    console.error(data.error || 'Failed to fetch projects');
                }
            } catch (err) {
                console.error('Error fetching projects', err);
            }
        };

        fetchProjects();
    }, []);


    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold mb-4">My Projects</h1>

                <button
                    onClick={() => setShowModal(true)}
                    className="mb-4 bg-blue-600 text-white px-4 py-2 rounded"
                >
                    Create Project
                </button>

                {projects.length === 0 ? (
                    <p className="text-gray-500">You don't have any projects yet.</p>
                ) : (
                    <ul className="space-y-2">
                        {projects.map((proj) => (
                            <li
                                key={proj._id}
                                className="bg-white p-4 rounded shadow cursor-pointer hover:bg-gray-100"
                                onClick={() => navigate(`/studio?id=${proj._id}`)}
                            >
                                <h3 className="font-semibold">{proj.name}</h3>
                                <p className="text-sm text-gray-600">{proj.description}</p>
                            </li>
                        ))}
                    </ul>

                )}
            </div>

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
