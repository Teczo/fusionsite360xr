import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    User2,
    Mail,
    Image as ImageIcon,
    ShieldCheck,
    Globe,
    Building2,
    Bell,
    Lock,
    Languages,
    CalendarClock,
    Save,
} from 'lucide-react';

export default function ProfileEdit({ setActiveView }) {
    const navigate = useNavigate();
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
                setLoading(true);
                setError('');
                const res = await fetch(`${import.meta.env.VITE_API_URL}/api/profile`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) throw new Error(`Load failed (${res.status})`);
                const data = await res.json();
                setForm({
                    name: data?.name || '',
                    email: data?.email || '',
                    profile: {
                        username: data?.profile?.username || '',
                        about: data?.profile?.about || '',
                        avatarUrl: data?.profile?.avatarUrl || '',
                        coverUrl: data?.profile?.coverUrl || '',
                        firstName: data?.profile?.firstName || '',
                        lastName: data?.profile?.lastName || '',
                        role: data?.profile?.role || '',
                        organization: data?.profile?.organization || '',
                        locale: data?.profile?.locale || 'en',
                        timezone: data?.profile?.timezone || '',
                        address: {
                            country: data?.profile?.address?.country || '',
                            street: data?.profile?.address?.street || '',
                            city: data?.profile?.address?.city || '',
                            region: data?.profile?.address?.region || '',
                            postalCode: data?.profile?.address?.postalCode || '',
                        },
                        notifications: {
                            comments: data?.profile?.notifications?.comments ?? true,
                            candidates: data?.profile?.notifications?.candidates ?? false,
                            offers: data?.profile?.notifications?.offers ?? false,
                            push: data?.profile?.notifications?.push || 'everything',
                        },
                    },
                });
            } catch (e) {
                console.error(e);
                setError('Could not load your profile.');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const memberSince = useMemo(() => {
        const d = form?.createdAt ? new Date(form.createdAt) : null;
        return d ? d.toLocaleDateString() : null;
    }, [form?.createdAt]);

    const onSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        try {
            setSaving(true);
            setError('');
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/profile`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(form),
            });
            if (!res.ok) throw new Error(`Save failed (${res.status})`);
            setActiveView('profile');
        } catch (e) {
            console.error(e);
            setError('Failed to save profile. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-6 text-subtle">Loading profile…</div>;

    return (
        <form onSubmit={onSubmit} className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
            {/* Top bar */}
            <div className="flex items-center justify-between">
                <button
                    type="button"
                    onClick={() => setActiveView('profile')}
                    className="inline-flex items-center gap-2 text-subtle hover:text-title"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to profile
                </button>
                <div className="flex items-center gap-3">
                    {error && <span className="text-sm text-red-400 mr-2">{error}</span>}
                    <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center gap-2 rounded-xl px-4 py-2 bg-brand text-black hover:bg-brand-600 disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save changes'}
                    </button>
                </div>
            </div>

            {/* Identity */}
            <Card>
                <CardHeader icon={<User2 className="w-5 h-5" />} title="Identity" subtitle="Your public profile details" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Display name">
                        <Input value={form.name} onChange={(e) => setTop('name', e.target.value)} placeholder="Jane Doe" />
                    </Field>
                    <Field label="Email address">
                        <Input type="email" value={form.email} onChange={(e) => setTop('email', e.target.value)} placeholder="jane@school.edu" />
                    </Field>
                    <Field className="sm:col-span-2" label="Username (public link)">
                        <div className="flex items-center rounded-xl bg-white/5 pl-3 border border-white/10 focus-within:ring-2 focus-within:ring-brand/40">
                            <div className="shrink-0 text-sm text-subtle select-none">holoxr.teczo.co/</div>
                            <input
                                className="min-w-0 grow bg-transparent py-2 pr-3 pl-2 text-title outline-none"
                                value={form.profile.username}
                                onChange={(e) => setProfile('username', e.target.value)}
                                placeholder="janedoe"
                            />
                        </div>
                    </Field>
                    <Field className="sm:col-span-2" label="About">
                        <Textarea rows={4} value={form.profile.about} onChange={(e) => setProfile('about', e.target.value)} placeholder="Tell others about you…" />
                    </Field>
                </div>
            </Card>

            {/* Photos */}
            <Card>
                <CardHeader icon={<ImageIcon className="w-5 h-5" />} title="Photos" subtitle="Avatar & cover image URLs (uploads coming soon)" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Avatar URL">
                        <Input value={form.profile.avatarUrl} onChange={(e) => setProfile('avatarUrl', e.target.value)} placeholder="https://…/avatar.png" />
                    </Field>
                    <Field label="Cover URL">
                        <Input value={form.profile.coverUrl} onChange={(e) => setProfile('coverUrl', e.target.value)} placeholder="https://…/cover.jpg" />
                    </Field>
                </div>
            </Card>

            {/* Personal & Org */}
            <Card>
                <CardHeader icon={<Building2 className="w-5 h-5" />} title="Personal & Organization" subtitle="These help personalize templates and onboarding" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="First name"><Input value={form.profile.firstName} onChange={(e) => setProfile('firstName', e.target.value)} /></Field>
                    <Field label="Last name"><Input value={form.profile.lastName} onChange={(e) => setProfile('lastName', e.target.value)} /></Field>
                    <Field label="Role"><Input value={form.profile.role} onChange={(e) => setProfile('role', e.target.value)} placeholder="Teacher / Student / Creator / Business" /></Field>
                    <Field label="Organization"><Input value={form.profile.organization} onChange={(e) => setProfile('organization', e.target.value)} placeholder="School / Company" /></Field>
                </div>
            </Card>

            {/* Address */}
            <Card>
                <CardHeader icon={<Globe className="w-5 h-5" />} title="Address" subtitle="Where you are based" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field className="sm:col-span-2" label="Street"><Input value={form.profile.address.street} onChange={(e) => setAddress('street', e.target.value)} /></Field>
                    <Field label="City"><Input value={form.profile.address.city} onChange={(e) => setAddress('city', e.target.value)} /></Field>
                    <Field label="State / Province"><Input value={form.profile.address.region} onChange={(e) => setAddress('region', e.target.value)} /></Field>
                    <Field label="ZIP / Postal code"><Input value={form.profile.address.postalCode} onChange={(e) => setAddress('postalCode', e.target.value)} /></Field>
                    <Field label="Country"><Input value={form.profile.address.country} onChange={(e) => setAddress('country', e.target.value)} placeholder="Australia" /></Field>
                </div>
            </Card>

            {/* Locale */}
            <Card>
                <CardHeader icon={<Languages className="w-5 h-5" />} title="Language & Time" subtitle="Regional display preferences" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Language code (locale)"><Input value={form.profile.locale} onChange={(e) => setProfile('locale', e.target.value)} placeholder="en, ms, ta, …" /></Field>
                    <Field label="Timezone"><Input value={form.profile.timezone} onChange={(e) => setProfile('timezone', e.target.value)} placeholder="Asia/Kuala_Lumpur, Australia/Perth" /></Field>
                </div>
            </Card>

            {/* Security */}
            <Card>
                <CardHeader icon={<ShieldCheck className="w-5 h-5" />} title="Security" subtitle="Keep your account secure" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Field label="Current password"><Input type="password" placeholder="••••••••" disabled /></Field>
                    <Field label="New password"><Input type="password" placeholder="Set a new password (API hook)" disabled /></Field>
                    <Field label="Confirm new password"><Input type="password" placeholder="Repeat new password" disabled /></Field>
                </div>
                <p className="text-subtle text-xs mt-2">Password change and 2FA setup can be wired to dedicated endpoints later.</p>
            </Card>

            {/* Notifications */}
            <Card>
                <CardHeader icon={<Bell className="w-5 h-5" />} title="Notifications" subtitle="Your preferences" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <SwitchRow label="Comments" checked={form.profile.notifications.comments} onChange={(v) => setNotif('comments', v)} />
                    <SwitchRow label="Candidates" checked={form.profile.notifications.candidates} onChange={(v) => setNotif('candidates', v)} />
                    <SwitchRow label="Offers" checked={form.profile.notifications.offers} onChange={(v) => setNotif('offers', v)} />
                    <Field label="Push mode">
                        <select
                            className="w-full rounded-xl bg-white/5 border border-white/10 p-2 text-title"
                            value={form.profile.notifications.push}
                            onChange={(e) => setNotif('push', e.target.value)}
                        >
                            <option value="everything">Everything</option>
                            <option value="same_as_email">Same as email</option>
                            <option value="none">No push notifications</option>
                        </select>
                    </Field>
                </div>
            </Card>

            {/* Meta */}
            <Card>
                <CardHeader icon={<CalendarClock className="w-5 h-5" />} title="Meta" subtitle="Account dates" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <ReadOnly label="Member since" value={memberSince || '—'} />
                    <ReadOnly label="Last updated" value={new Date().toLocaleString()} />
                    <ReadOnly label="Auth method" value={'Email & password'} />
                </div>
            </Card>

            {/* Footer actions */}
            <div className="flex items-center justify-end gap-3">
                <button type="button" onClick={() => setActiveView('profile')} className="text-subtle hover:text-title">Cancel</button>
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl px-4 py-2 bg-brand text-black hover:bg-brand-600 disabled:opacity-50">
                    <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save changes'}
                </button>
            </div>
        </form>
    );
}

function Card({ children }) {
    return <div className="rounded-2xl border border-white/10 bg-white/5 p-4">{children}</div>;
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

function Field({ label, children, className = '' }) {
    return (
        <label className={`block space-y-1 ${className}`}>
            <span className="text-subtle text-xs">{label}</span>
            {children}
        </label>
    );
}

function Input(props) {
    return (
        <input
            {...props}
            className={`w-full rounded-xl bg-white/5 border border-white/10 p-2 text-title outline-none focus:ring-2 focus:ring-brand/40 ${props.className || ''
                }`}
        />
    );
}

function Textarea(props) {
    return (
        <textarea
            {...props}
            className={`w-full rounded-xl bg-white/5 border border-white/10 p-2 text-title outline-none focus:ring-2 focus:ring-brand/40 ${props.className || ''
                }`}
        />
    );
}

function SwitchRow({ label, checked, onChange }) {
    return (
        <div className="flex items-center justify-between rounded-xl bg-black/20 border border-white/10 p-3">
            <span className="text-title text-sm">{label}</span>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={() => onChange(!checked)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-brand' : 'bg-white/20'}`}
            >
                <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-1'}`}
                />
            </button>
        </div>
    );
}

function ReadOnly({ label, value }) {
    return (
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="text-subtle text-xs">{label}</div>
            <div className="text-title">{value || '—'}</div>
        </div>
    );
}
