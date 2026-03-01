import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LogOut,
    Pencil,
    Mail,
    User2,
    ShieldCheck,
    Smartphone,
    Bell,
    Globe,
    CreditCard,
    BarChart3,
    Sparkles,
    CalendarClock,
} from 'lucide-react';

export default function ProfileView({ setActiveView }) {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('token');
        (async () => {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/api/profile`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data?.error);
                setUser(data);
            } catch (e) {
                setError('Couldn’t load profile.');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const profile = user?.profile || {};
    const address = profile.address || {};
    const notifications = profile.notifications || {};

    const memberSince = useMemo(() => {
        return user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—';
    }, [user]);

    const lastUpdated = useMemo(() => {
        return user?.updatedAt ? new Date(user.updatedAt).toLocaleString() : '—';
    }, [user]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/signin');
    };

    if (loading) return <div className="p-6 text-gray-500">Loading profile…</div>;
    if (error) return <div className="p-6 text-red-500">{error}</div>;
    if (!user) return null;

    return (
        <div className="max-w-6xl mx-auto px-6 py-10 space-y-8 bg-gray-50 min-h-screen">

            {/* HEADER */}
            <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="h-40 bg-gradient-to-r from-indigo-500 to-indigo-400" />
                <div className="px-8 pb-8">
                    <div className="-mt-12 flex items-end justify-between">
                        <div className="flex items-end gap-5">
                            <div className="h-24 w-24 rounded-full bg-white border-4 border-white shadow-md overflow-hidden">
                                {profile.avatarUrl ? (
                                    <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                                        No Photo
                                    </div>
                                )}
                            </div>

                            <div>
                                <h1 className="text-2xl font-semibold text-gray-900">
                                    {user.name || 'Unnamed User'}
                                </h1>
                                <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
                                    <span className="flex items-center gap-1">
                                        <Mail className="w-4 h-4" /> {user.email}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <CalendarClock className="w-4 h-4" />
                                        Member since {memberSince}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setActiveView('profileedit')}
                                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                <Pencil className="w-4 h-4 inline mr-2" />
                                Edit Profile
                            </button>

                            <button
                                onClick={handleLogout}
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
                            >
                                <LogOut className="w-4 h-4 inline mr-2" />
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* QUICK ACTIONS */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <ActionCard icon={<CreditCard />} title="Manage Billing" onClick={() => setActiveView('billing')} />
                <ActionCard icon={<BarChart3 />} title="View Analytics" onClick={() => setActiveView('analytics')} />
                <ActionCard icon={<Sparkles />} title="Your Designs" onClick={() => setActiveView('your-designs')} />
                <ActionCard icon={<Bell />} title="Notification Settings" onClick={() => setActiveView('profileedit')} />
            </section>

            {/* MAIN GRID */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                <div className="lg:col-span-2 space-y-6">
                    {profile.about && (
                        <Card title="About">
                            <p className="text-gray-600 leading-relaxed">{profile.about}</p>
                        </Card>
                    )}

                    <Card title="Contact & Address">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Info label="Full Name" value={`${profile.firstName || ''} ${profile.lastName || ''}`} />
                            <Info label="Country" value={address.country} />
                            <Info label="Street" value={address.street} />
                            <Info label="City" value={address.city} />
                            <Info label="State / Province" value={address.region} />
                            <Info label="ZIP" value={address.postalCode} />
                        </div>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card title="Security">
                        <Info label="Email verified" value={user?.emailVerified ? 'Yes' : 'No'} />
                        <Info label="Last updated" value={lastUpdated} />
                    </Card>

                    <Card title="Notifications">
                        <Info label="Comments" value={notifications.comments ? 'On' : 'Off'} />
                        <Info label="Offers" value={notifications.offers ? 'On' : 'Off'} />
                    </Card>

                    <Card title="Devices">
                        <Info label="Current device" value="Active now" />
                        <Info label="Last login" value={new Date().toLocaleDateString()} />
                    </Card>
                </div>

            </section>
        </div>
    );
}

function ActionCard({ icon, title, onClick }) {
    return (
        <button
            onClick={onClick}
            className="rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm hover:shadow-md transition"
        >
            <div className="flex items-center gap-3 text-gray-700 font-medium">
                <div className="p-2 rounded-lg bg-gray-100">{icon}</div>
                {title}
            </div>
        </button>
    );
}

function Card({ title, children }) {
    return (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
            {children}
        </div>
    );
}

function Info({ label, value }) {
    return (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
            <div className="text-xs text-gray-500">{label}</div>
            <div className="text-gray-800">{value || '—'}</div>
        </div>
    );
}