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
                setLoading(true);
                const res = await fetch(`${import.meta.env.VITE_API_URL}/api/profile`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data?.error || 'Failed to load profile');
                setUser(data);
            } catch (e) {
                console.error(e);
                setError('Couldn\'t load your profile.');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const profile = user?.profile || {};
    const address = profile.address || {};
    const notifications = profile.notifications || {};

    const memberSince = useMemo(() => {
        const d = user?.createdAt ? new Date(user.createdAt) : null;
        return d ? d.toLocaleDateString() : '—';
    }, [user]);

    const lastUpdated = useMemo(() => {
        const d = user?.updatedAt ? new Date(user.updatedAt) : null;
        return d ? d.toLocaleString() : '—';
    }, [user]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/signin');
    };

    if (loading) return <div className="p-6 text-subtle">Loading profile…</div>;
    if (error) return <div className="p-6 text-red-400">{error}</div>;
    if (!user) return <div className="p-6 text-red-400">No profile data.</div>;

    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
            {/* Header / Identity */}
            <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                {/* Cover */}
                <div className="relative h-40 sm:h-48">
                    {profile.coverUrl ? (
                        <img src={profile.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-r from-brand/20 to-brand/5" />
                    )}
                    {/* Avatar */}
                    <div className="absolute -bottom-10 left-6">
                        <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full border-4 border-[#0b0c0f] overflow-hidden bg-white/10">
                            {profile.avatarUrl ? (
                                <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-subtle">NO PHOTO</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Identity + Actions */}
                <div className="pt-14 px-6 pb-6">
                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-semibold text-title">{user.name || 'Unnamed User'}</h1>
                            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
                                <span className="inline-flex items-center gap-1 text-subtle"><Mail className="w-4 h-4" /> {user.email}</span>
                                {profile.username && (
                                    <span className="inline-flex items-center gap-1 text-subtle"><User2 className="w-4 h-4" /> holoxr.teczo.co/{profile.username}</span>
                                )}
                                <span className="inline-flex items-center gap-1 text-subtle"><CalendarClock className="w-4 h-4" /> Member since {memberSince}</span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setActiveView('profileedit')}
                                className="inline-flex items-center gap-2 rounded-xl px-3 py-2 bg-white/10 hover:bg-white/15 border border-white/10 text-title"
                            >
                                <Pencil className="w-4 h-4" /> Edit Profile
                            </button>
                            <button
                                onClick={handleLogout}
                                className="inline-flex items-center gap-2 rounded-xl px-3 py-2 bg-red-600/90 hover:bg-red-600 text-white"
                            >
                                <LogOut className="w-4 h-4" /> Logout
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Quick Actions */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <ActionCard icon={<CreditCard className="w-5 h-5" />} title="Manage Billing" onClick={() => setActiveView('billing')} subtitle="Plans, invoices, payment methods" />
                <ActionCard icon={<BarChart3 className="w-5 h-5" />} title="View Analytics" onClick={() => setActiveView('analytics')} subtitle="Usage & engagement overview" />
                <ActionCard icon={<Sparkles className="w-5 h-5" />} title="Your Designs" onClick={() => setActiveView('your-designs')} subtitle="Projects you created" />
                <ActionCard icon={<Bell className="w-5 h-5" />} title="Notification Settings" onClick={() => setActiveView('profileedit')} subtitle="Email & push preferences" />
            </section>

            {/* 2-column layout */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left: About & Contact */}
                <div className="space-y-4 lg:col-span-2">
                    {profile.about?.trim()?.length > 0 && (
                        <Card>
                            <CardHeader icon={<User2 className="w-5 h-5" />} title="About" subtitle="A short bio that others can see" />
                            <p className="text-textsec leading-relaxed">{profile.about}</p>
                        </Card>
                    )}

                    <Card>
                        <CardHeader icon={<Globe className="w-5 h-5" />} title="Contact & Address" subtitle="Where you are based" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Info label="Full Name" value={`${profile.firstName || ''} ${profile.lastName || ''}`.trim() || '—'} />
                            <Info label="Country" value={address.country} />
                            <Info label="Street" value={address.street} />
                            <Info label="City" value={address.city} />
                            <Info label="State / Province" value={address.region} />
                            <Info label="ZIP / Postal code" value={address.postalCode} />
                        </div>
                    </Card>
                </div>

                {/* Right: Security & Notifications */}
                <div className="space-y-4">
                    <Card>
                        <CardHeader icon={<ShieldCheck className="w-5 h-5" />} title="Security" subtitle="Keep your account secure" />
                        <div className="space-y-2">
                            <Info label="Sign-in method" value={user?.authProvider || (user?.providers?.join(', ') || 'Email & password')} />
                            <Info label="Email verified" value={user?.emailVerified ? 'Yes' : 'No'} />
                            <Info label="Last updated" value={lastUpdated} />
                            <button onClick={() => setActiveView('profileedit')} className="mt-2 inline-flex items-center gap-2 rounded-lg px-3 py-2 bg-white/10 hover:bg-white/15 border border-white/10 text-title">
                                <ShieldCheck className="w-4 h-4" /> Update password / 2FA
                            </button>
                        </div>
                    </Card>

                    <Card>
                        <CardHeader icon={<Bell className="w-5 h-5" />} title="Notifications" subtitle="Your current preferences" />
                        <ul className="text-textsec space-y-1 text-sm">
                            <li>Comments: {notifications.comments ? 'On' : 'Off'}</li>
                            <li>Candidates: {notifications.candidates ? 'On' : 'Off'}</li>
                            <li>Offers: {notifications.offers ? 'On' : 'Off'}</li>
                            <li>Push: {{
                                everything: 'Everything',
                                same_as_email: 'Same as email',
                                none: 'No push notifications',
                            }[notifications.push || 'everything']}
                            </li>
                        </ul>
                    </Card>

                    <Card>
                        <CardHeader icon={<Smartphone className="w-5 h-5" />} title="Devices" subtitle="Recent sessions (example)" />
                        <ul className="text-textsec space-y-1 text-sm">
                            <li>Current device · Active now</li>
                            <li>Last login · {new Date().toLocaleDateString()}</li>
                        </ul>
                    </Card>
                </div>
            </section>
        </div>
    );
}

function ActionCard({ icon, title, subtitle, onClick }) {
    return (
        <button onClick={onClick} className="group text-left rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors p-4 w-full">
            <div className="flex items-center gap-3 text-title">
                <div className="rounded-xl bg-black/30 p-2 border border-white/10">{icon}</div>
                <div className="font-medium">{title}</div>
            </div>
            <div className="text-subtle text-sm mt-1">{subtitle}</div>
        </button>
    );
}

function Card({ children }) {
    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">{children}</div>
    );
}

function CardHeader({ icon, title, subtitle }) {
    return (
        <div className="flex items-start gap-3 mb-3">
            <div className="rounded-xl bg-black/30 p-2 border border-white/10 text-title">{icon}</div>
            <div>
                <h3 className="text-title font-semibold">{title}</h3>
                {subtitle && <p className="text-subtle text-sm">{subtitle}</p>}
            </div>
        </div>
    );
}

function Info({ label, value }) {
    const display = (value ?? '').toString().trim();
    return (
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="text-subtle text-xs">{label}</div>
            <div className="text-title">{display || '—'}</div>
        </div>
    );
}
