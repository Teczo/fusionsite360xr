// src/pages/ProfileView.jsx
import { useEffect, useState } from 'react';


export default function ProfileView({ setActiveView }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token'); // matches your existing auth usage
        (async () => {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/api/profile`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await res.json();
                setUser(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    if (loading) return <div className="p-6 text-gray-400">Loading profile…</div>;
    if (!user) return <div className="p-6 text-red-400">Couldn’t load profile.</div>;

    const p = user.profile || {};
    const addr = p.address || {};
    const n = p.notifications || {};

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            {/* Cover */}
            <div className="relative h-40 rounded-xl overflow-hidden bg-white/5 border border-white/10">
                {p.coverUrl ? (
                    <img src={p.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">No cover</div>
                )}
                {/* Avatar */}
                <div className="absolute -bottom-8 left-6">
                    <div className="h-20 w-20 rounded-full border-4 border-[#0b0c0f] overflow-hidden bg-white/10">
                        {p.avatarUrl ? (
                            <img src={p.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">No photo</div>
                        )}
                    </div>
                </div>
            </div>

            <div className="pt-10 flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-white">{user.name}</h1>
                    <p className="text-gray-400">{user.email}</p>
                    {p.username && <p className="text-gray-400">holoxr.teczo.co/{p.username}</p>}
                </div>
                <button
                    key={'profileedit'}
                    onClick={() => setActiveView('profileedit')}
                    className="rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-600"
                >
                    Edit Profile
                </button>

            </div>

            {/* About */}
            {(p.about?.trim()?.length ?? 0) > 0 && (
                <section className="space-y-2">
                    <h2 className="text-white font-medium">About</h2>
                    <p className="text-gray-300 leading-relaxed">{p.about}</p>
                </section>
            )}

            {/* Personal Info */}
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {p.firstName || p.lastName ? (
                    <Info label="Full Name" value={`${p.firstName ?? ''} ${p.lastName ?? ''}`.trim()} />
                ) : null}
                <Info label="Country" value={addr.country} />
                <Info label="Street" value={addr.street} />
                <Info label="City" value={addr.city} />
                <Info label="State / Province" value={addr.region} />
                <Info label="ZIP / Postal code" value={addr.postalCode} />
            </section>

            {/* Notifications */}
            <section className="space-y-2">
                <h2 className="text-white font-medium">Notifications</h2>
                <ul className="text-gray-300 space-y-1">
                    <li>Comments: {n.comments ? 'On' : 'Off'}</li>
                    <li>Candidates: {n.candidates ? 'On' : 'Off'}</li>
                    <li>Offers: {n.offers ? 'On' : 'Off'}</li>
                    <li>Push: {{
                        everything: 'Everything',
                        same_as_email: 'Same as email',
                        none: 'No push notifications'
                    }[n.push || 'everything']}
                    </li>
                </ul>
            </section>
        </div>
    );
}

function Info({ label, value }) {
    if (!value) return null;
    return (
        <div className="rounded-lg border border-white/10 p-3 bg-white/5">
            <div className="text-gray-400 text-xs">{label}</div>
            <div className="text-white">{value}</div>
        </div>
    );
}
