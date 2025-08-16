// src/pages/ProfilePage.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhotoIcon, UserCircleIcon } from '@heroicons/react/24/solid';
import { ChevronDownIcon } from '@heroicons/react/16/solid';

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
            address: { country: '', street: '', city: '', region: '', postalCode: '' },
            notifications: { comments: true, candidates: false, offers: false, push: 'everything' }
        }
    });

    // Helper to update top-level fields
    const setTop = (key, val) => setForm(f => ({ ...f, [key]: val }));

    // Helper to update nested profile fields
    const setProfile = (key, val) =>
        setForm(f => ({ ...f, profile: { ...f.profile, [key]: val } }));

    // Helper to update nested address fields
    const setAddress = (key, val) =>
        setForm(f => ({
            ...f,
            profile: { ...f.profile, address: { ...f.profile.address, [key]: val } }
        }));

    // Helper to update nested notification fields
    const setNotif = (key, val) =>
        setForm(f => ({
            ...f,
            profile: {
                ...f.profile,
                notifications: { ...f.profile.notifications, [key]: val }
            }
        }));

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
                        }
                    }
                });
            } catch (e) {
                console.error(e);
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
            setError('');
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/profile`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(form),
            });
            if (!res.ok) throw new Error(`Save failed (${res.status})`);
            // Optional: navigate back to the read-only profile page
            setActiveView('profile');
        } catch (e) {
            console.error(e);
            setError('Failed to save profile. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-6 text-gray-400">Loading profile…</div>;
    }

    return (
        <form onSubmit={onSubmit} className="max-w-3xl mx-auto">
            <div className="space-y-12">
                {/* Profile section */}
                <div className="border-b border-white/10 pb-12">
                    <h2 className="text-base/7 font-semibold text-white">Profile</h2>
                    <p className="mt-1 text-sm/6 text-gray-400">
                        This information will be displayed publicly so be careful what you share.
                    </p>

                    <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">

                        {/* Display Name */}
                        <div className="sm:col-span-3">
                            <label htmlFor="name" className="block text-sm/6 font-medium text-white">Display name</label>
                            <div className="mt-2">
                                <input
                                    id="name"
                                    name="name"
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setTop('name', e.target.value)}
                                    className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6"
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div className="sm:col-span-3">
                            <label htmlFor="email" className="block text-sm/6 font-medium text-white">Email address</label>
                            <div className="mt-2">
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => setTop('email', e.target.value)}
                                    className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6"
                                />
                            </div>
                        </div>

                        {/* Username */}
                        <div className="sm:col-span-4">
                            <label htmlFor="username" className="block text-sm/6 font-medium text-white">Username</label>
                            <div className="mt-2">
                                <div className="flex items-center rounded-md bg-white/5 pl-3 outline-1 -outline-offset-1 outline-white/10 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-indigo-500">
                                    <div className="shrink-0 text-base text-gray-400 select-none sm:text-sm/6">
                                        holoxr.teczo.co/
                                    </div>
                                    <input
                                        id="username"
                                        name="username"
                                        type="text"
                                        placeholder="janesmith"
                                        value={form.profile.username}
                                        onChange={(e) => setProfile('username', e.target.value)}
                                        className="block min-w-0 grow bg-transparent py-1.5 pr-3 pl-1 text-base text-white placeholder:text-gray-500 focus:outline-none sm:text-sm/6"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* About */}
                        <div className="col-span-full">
                            <label htmlFor="about" className="block text-sm/6 font-medium text-white">About</label>
                            <div className="mt-2">
                                <textarea
                                    id="about"
                                    name="about"
                                    rows={3}
                                    value={form.profile.about}
                                    onChange={(e) => setProfile('about', e.target.value)}
                                    className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6"
                                />
                            </div>
                            <p className="mt-3 text-sm/6 text-gray-400">Write a few sentences about yourself.</p>
                        </div>

                        {/* Avatar */}
                        <div className="col-span-full">
                            <label className="block text-sm/6 font-medium text-white">Photo</label>
                            <div className="mt-2 flex items-center gap-x-3">
                                <div className="h-12 w-12 rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
                                    {form.profile.avatarUrl ? (
                                        <img src={form.profile.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                                    ) : (
                                        <UserCircleIcon className="h-12 w-12 text-gray-500" aria-hidden="true" />
                                    )}
                                </div>
                                <input
                                    type="url"
                                    placeholder="https://…/avatar.png"
                                    value={form.profile.avatarUrl}
                                    onChange={(e) => setProfile('avatarUrl', e.target.value)}
                                    className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6"
                                />
                            </div>
                        </div>

                        {/* Cover Photo */}
                        <div className="col-span-full">
                            <label className="block text-sm/6 font-medium text-white">Cover photo</label>
                            <div className="mt-2 flex items-center gap-x-3">
                                <div className="h-16 w-28 rounded-lg overflow-hidden bg-white/10 flex items-center justify-center">
                                    {form.profile.coverUrl ? (
                                        <img src={form.profile.coverUrl} alt="Cover" className="h-full w-full object-cover" />
                                    ) : (
                                        <PhotoIcon className="h-10 w-10 text-gray-500" aria-hidden="true" />
                                    )}
                                </div>
                                <input
                                    type="url"
                                    placeholder="https://…/cover.jpg"
                                    value={form.profile.coverUrl}
                                    onChange={(e) => setProfile('coverUrl', e.target.value)}
                                    className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6"
                                />
                            </div>
                        </div>

                        {/* First/Last name */}
                        <div className="sm:col-span-3">
                            <label htmlFor="first-name" className="block text-sm/6 font-medium text-white">First name</label>
                            <div className="mt-2">
                                <input
                                    id="first-name"
                                    name="first-name"
                                    type="text"
                                    value={form.profile.firstName}
                                    onChange={(e) => setProfile('firstName', e.target.value)}
                                    className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6"
                                />
                            </div>
                        </div>

                        <div className="sm:col-span-3">
                            <label htmlFor="last-name" className="block text-sm/6 font-medium text-white">Last name</label>
                            <div className="mt-2">
                                <input
                                    id="last-name"
                                    name="last-name"
                                    type="text"
                                    value={form.profile.lastName}
                                    onChange={(e) => setProfile('lastName', e.target.value)}
                                    className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6"
                                />
                            </div>
                        </div>

                        {/* Address */}
                        <div className="col-span-full">
                            <label htmlFor="street-address" className="block text-sm/6 font-medium text-white">Street address</label>
                            <div className="mt-2">
                                <input
                                    id="street-address"
                                    name="street-address"
                                    type="text"
                                    value={form.profile.address.street}
                                    onChange={(e) => setAddress('street', e.target.value)}
                                    className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6"
                                />
                            </div>
                        </div>

                        <div className="sm:col-span-2 sm:col-start-1">
                            <label htmlFor="city" className="block text-sm/6 font-medium text-white">City</label>
                            <div className="mt-2">
                                <input
                                    id="city"
                                    name="city"
                                    type="text"
                                    value={form.profile.address.city}
                                    onChange={(e) => setAddress('city', e.target.value)}
                                    className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6"
                                />
                            </div>
                        </div>

                        <div className="sm:col-span-2">
                            <label htmlFor="region" className="block text-sm/6 font-medium text-white">State / Province</label>
                            <div className="mt-2">
                                <input
                                    id="region"
                                    name="region"
                                    type="text"
                                    value={form.profile.address.region}
                                    onChange={(e) => setAddress('region', e.target.value)}
                                    className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6"
                                />
                            </div>
                        </div>

                        <div className="sm:col-span-2">
                            <label htmlFor="postal-code" className="block text-sm/6 font-medium text-white">ZIP / Postal code</label>
                            <div className="mt-2">
                                <input
                                    id="postal-code"
                                    name="postal-code"
                                    type="text"
                                    autoComplete="postal-code"
                                    value={form.profile.address.postalCode}
                                    onChange={(e) => setAddress('postalCode', e.target.value)}
                                    className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6"
                                />
                            </div>
                        </div>

                        <div className="sm:col-span-3">
                            <label htmlFor="country" className="block text-sm/6 font-medium text-white">Country</label>
                            <div className="mt-2">
                                <div className="relative">
                                    <select
                                        id="country"
                                        name="country"
                                        value={form.profile.address.country}
                                        onChange={(e) => setAddress('country', e.target.value)}
                                        className="block w-full appearance-none rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6"
                                    >
                                        <option value="">Select a country</option>
                                        <option value="Australia">Australia</option>
                                        <option value="Malaysia">Malaysia</option>
                                        <option value="Singapore">Singapore</option>
                                        <option value="United States">United States</option>
                                        <option value="United Kingdom">United Kingdom</option>
                                        {/* add more as needed */}
                                    </select>
                                    <ChevronDownIcon className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-gray-400" />
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Notifications */}
                <div className="border-b border-white/10 pb-12">
                    <h2 className="text-base/7 font-semibold text-white">Notifications</h2>
                    <p className="mt-1 text-sm/6 text-gray-400">
                        We'll always let you know about important changes, but you pick what else you want to hear about.
                    </p>

                    <div className="mt-10 space-y-10">
                        <fieldset>
                            <legend className="text-sm/6 font-semibold text-white">By email</legend>
                            <div className="mt-6 space-y-6">
                                <CheckboxRow
                                    id="comments"
                                    label="Comments"
                                    description="Get notified when someone posts a comment on a posting."
                                    checked={form.profile.notifications.comments}
                                    onChange={(v) => setNotif('comments', v)}
                                />
                                <CheckboxRow
                                    id="candidates"
                                    label="Candidates"
                                    description="Get notified when a candidate applies for a job."
                                    checked={form.profile.notifications.candidates}
                                    onChange={(v) => setNotif('candidates', v)}
                                />
                                <CheckboxRow
                                    id="offers"
                                    label="Offers"
                                    description="Get notified when a candidate accepts or rejects an offer."
                                    checked={form.profile.notifications.offers}
                                    onChange={(v) => setNotif('offers', v)}
                                />
                            </div>
                        </fieldset>

                        <fieldset>
                            <legend className="text-sm/6 font-semibold text-white">Push notifications</legend>
                            <p className="mt-1 text-sm/6 text-gray-400">These are delivered via SMS to your mobile phone.</p>
                            <div className="mt-6 space-y-6">
                                <RadioRow
                                    id="push-everything"
                                    name="push"
                                    label="Everything"
                                    value="everything"
                                    checked={form.profile.notifications.push === 'everything'}
                                    onChange={() => setNotif('push', 'everything')}
                                />
                                <RadioRow
                                    id="push-same"
                                    name="push"
                                    label="Same as email"
                                    value="same_as_email"
                                    checked={form.profile.notifications.push === 'same_as_email'}
                                    onChange={() => setNotif('push', 'same_as_email')}
                                />
                                <RadioRow
                                    id="push-none"
                                    name="push"
                                    label="No push notifications"
                                    value="none"
                                    checked={form.profile.notifications.push === 'none'}
                                    onChange={() => setNotif('push', 'none')}
                                />
                            </div>
                        </fieldset>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex items-center justify-end gap-x-4">
                {error && <span className="text-sm text-red-400 mr-auto">{error}</span>}
                <button
                    type="button"
                    onClick={() => setActiveView('profile')}
                    className="text-sm font-semibold text-gray-300 hover:text-white"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={saving}
                    className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-600 disabled:opacity-50"
                >
                    {saving ? 'Saving…' : 'Save'}
                </button>
            </div>
        </form>
    );
}

function CheckboxRow({ id, label, description, checked, onChange }) {
    return (
        <div className="flex gap-3">
            <div className="flex h-6 shrink-0 items-center">
                <input
                    id={id}
                    name={id}
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                    aria-describedby={`${id}-description`}
                    className="size-4 rounded border-white/20 bg-white/5 text-indigo-500 focus:ring-0"
                />
            </div>
            <div className="text-sm/6">
                <label htmlFor={id} className="font-medium text-white">{label}</label>
                <p id={`${id}-description`} className="text-gray-400">{description}</p>
            </div>
        </div>
    );
}

function RadioRow({ id, name, label, value, checked, onChange }) {
    return (
        <div className="flex items-center gap-3">
            <input
                id={id}
                name={name}
                type="radio"
                value={value}
                checked={checked}
                onChange={onChange}
                className="size-4 border-white/20 bg-white/5 text-indigo-500 focus:ring-0"
            />
            <label htmlFor={id} className="block text-sm/6 font-medium text-white">{label}</label>
        </div>
    );
}
