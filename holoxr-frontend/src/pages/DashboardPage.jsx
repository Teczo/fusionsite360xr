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
        </div>
    );
}
