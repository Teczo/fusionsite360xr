import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, User2, Image as ImageIcon, Globe, Building2, Bell, Languages, CalendarClock, Save } from 'lucide-react';

export default function ProfileEdit({ setActiveView }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const [form, setForm] = useState({
        name: '',
        email: '',
        profile: {
            username: '',
            about: '',
            avatarUrl: '',
            coverUrl: '',
            firstName: '',
            lastName: '',
            role: '',
            organization: '',
            locale: 'en',
            timezone: '',
            address: { country: '', street: '', city: '', region: '', postalCode: '' },
            notifications: { comments: true, candidates: false, offers: false, push: 'everything' },
        },
    });

    const setTop = (k, v) => setForm((f) => ({ ...f, [k]: v }));
    const setProfile = (k, v) => setForm((f) => ({ ...f, profile: { ...f.profile, [k]: v } }));
    const setAddress = (k, v) =>
        setForm((f) => ({ ...f, profile: { ...f.profile, address: { ...f.profile.address, [k]: v } } }));
    const setNotif = (k, v) =>
        setForm((f) => ({ ...f, profile: { ...f.profile, notifications: { ...f.profile.notifications, [k]: v } } }));

    useEffect(() => {
        const token = localStorage.getItem('token');
        (async () => {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/api/profile`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await res.json();
                setForm({
                    name: data?.name || '',
                    email: data?.email || '',
                    profile: {
                        ...form.profile,
                        ...data?.profile,
                        address: { ...form.profile.address, ...data?.profile?.address },
                        notifications: { ...form.profile.notifications, ...data?.profile?.notifications },
                    },
                });
            } catch {
                setError('Could not load your profile.');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const onSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        try {
            setSaving(true);
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/profile`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(form),
            });
            if (!res.ok) throw new Error();
            setActiveView('profile');
        } catch {
            setError('Failed to save profile.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-6 text-gray-500">Loading…</div>;

    return (
        <form onSubmit={onSubmit} className="max-w-6xl mx-auto px-6 py-10 space-y-8 bg-gray-50 min-h-screen">

            {/* Top Bar */}
            <div className="flex items-center justify-between">
                <button
                    type="button"
                    onClick={() => setActiveView('profile')}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to profile
                </button>

                <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving…' : 'Save changes'}
                </button>
            </div>

            {/* Identity */}
            <Card title="Identity">
                <div className="grid sm:grid-cols-2 gap-6">
                    <Field label="Display name">
                        <Input value={form.name} onChange={(e) => setTop('name', e.target.value)} />
                    </Field>
                    <Field label="Email">
                        <Input type="email" value={form.email} onChange={(e) => setTop('email', e.target.value)} />
                    </Field>
                    <Field className="sm:col-span-2" label="About">
                        <Textarea rows={4} value={form.profile.about} onChange={(e) => setProfile('about', e.target.value)} />
                    </Field>
                </div>
            </Card>

            {/* Address */}
            <Card title="Address">
                <div className="grid sm:grid-cols-2 gap-6">
                    <Field label="Street"><Input value={form.profile.address.street} onChange={(e) => setAddress('street', e.target.value)} /></Field>
                    <Field label="City"><Input value={form.profile.address.city} onChange={(e) => setAddress('city', e.target.value)} /></Field>
                    <Field label="State"><Input value={form.profile.address.region} onChange={(e) => setAddress('region', e.target.value)} /></Field>
                    <Field label="Postal Code"><Input value={form.profile.address.postalCode} onChange={(e) => setAddress('postalCode', e.target.value)} /></Field>
                    <Field label="Country"><Input value={form.profile.address.country} onChange={(e) => setAddress('country', e.target.value)} /></Field>
                </div>
            </Card>

            {/* Notifications */}
            <Card title="Notifications">
                <div className="space-y-4">
                    <SwitchRow label="Comments" checked={form.profile.notifications.comments} onChange={(v) => setNotif('comments', v)} />
                    <SwitchRow label="Offers" checked={form.profile.notifications.offers} onChange={(v) => setNotif('offers', v)} />
                </div>
            </Card>

            {/* Meta */}
            <Card title="Meta">
                <div className="grid sm:grid-cols-3 gap-6">
                    <ReadOnly label="Auth method" value="Email & password" />
                    <ReadOnly label="Locale" value={form.profile.locale} />
                    <ReadOnly label="Timezone" value={form.profile.timezone} />
                </div>
            </Card>

        </form>
    );
}

function Card({ title, children }) {
    return (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">{title}</h3>
            {children}
        </div>
    );
}

function Field({ label, children, className = '' }) {
    return (
        <div className={className}>
            <label className="block text-sm font-medium text-gray-600 mb-2">{label}</label>
            {children}
        </div>
    );
}

function Input(props) {
    return (
        <input
            {...props}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
        />
    );
}

function Textarea(props) {
    return (
        <textarea
            {...props}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
        />
    );
}

function SwitchRow({ label, checked, onChange }) {
    return (
        <div className="flex items-center justify-between border border-gray-200 rounded-lg p-4 bg-gray-50">
            <span className="text-sm text-gray-700">{label}</span>
            <button
                type="button"
                onClick={() => onChange(!checked)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${checked ? 'bg-indigo-600' : 'bg-gray-300'}`}
            >
                <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${checked ? 'translate-x-5' : 'translate-x-1'}`}
                />
            </button>
        </div>
    );
}

function ReadOnly({ label, value }) {
    return (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="text-xs text-gray-500">{label}</div>
            <div className="text-gray-900">{value || '—'}</div>
        </div>
    );
}