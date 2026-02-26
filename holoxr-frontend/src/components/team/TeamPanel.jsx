// components/team/TeamPanel.jsx
import { useEffect, useState } from 'react';
import { UserPlus, Users, Crown, Shield, User } from 'lucide-react';

export default function TeamPanel({ planLimits = {}, fetchTeam, inviteUser, updateRole, removeMember }) {
    const [members, setMembers] = useState([]);
    const [email, setEmail] = useState('');
    const [inviting, setInviting] = useState(false);

    useEffect(() => {
        (async () => {
            const list = await fetchTeam?.(); // expects [{id, name, email, role, status}]
            if (Array.isArray(list)) setMembers(list);
        })();
    }, [fetchTeam]);

    const onInvite = async () => {
        if (!email) return;
        setInviting(true);
        try {
            const added = await inviteUser?.(email); // returns new member
            if (added) setMembers((prev) => [added, ...prev]);
            setEmail('');
        } finally {
            setInviting(false);
        }
    };

    const teamMax = Number.isFinite(planLimits?.teamMembers?.max)
        ? planLimits.teamMembers.max
        : Infinity;
    const activeMembers = members.filter(m => m.status !== 'Pending').length;
    const canInviteMore = activeMembers < teamMax;

    const roleIcon = (role) => {
        if (role === 'Owner') return <Crown size={13} className="text-amber-500" />;
        if (role === 'Admin') return <Shield size={13} className="text-accent" />;
        return <User size={13} className="text-texttert" />;
    };

    const roleColor = (role) => {
        if (role === 'Owner') return 'bg-amber-50 text-amber-700 border-amber-200';
        if (role === 'Admin') return 'bg-blue-50 text-blue-700 border-blue-200';
        return 'bg-surface text-textsec border-border';
    };

    return (
        <div className="space-y-4">
            {/* Invite + Members in one card — ES style single panel */}
            <div className="bg-surface rounded-xl border border-border shadow-card overflow-hidden">
                {/* Invite section */}
                <div className="p-5 border-b border-border">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 rounded-lg bg-[#2C97D4]/10 shrink-0">
                                <UserPlus size={16} className="text-[#2C97D4]" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-sm font-semibold text-textpri" style={{ fontFamily: "'Syne', 'Inter', sans-serif" }}>
                                    Invite a teammate
                                </h3>
                                <p className="text-xs text-texttert truncate">
                                    {teamMax === Infinity ? 'Unlimited seats' : `${activeMembers} of ${teamMax} seats used`}
                                    {typeof planLimits?.sharedProjects?.max !== 'undefined' && (
                                        <> · Shared projects: {planLimits.sharedProjects.max === Infinity ? 'Unlimited' : planLimits.sharedProjects.max}</>
                                    )}
                                    {planLimits?.watermark && ' · Watermark on publish'}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                        <input
                            type="email"
                            placeholder="Enter email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && onInvite()}
                            className="flex-1 bg-appbg border border-border rounded-lg px-3 py-2 text-sm text-textpri placeholder:text-texttert focus:outline-none focus:ring-2 focus:ring-[#2C97D4]/20 focus:border-[#2C97D4]/40 transition-all"
                            disabled={!canInviteMore}
                        />
                        <button
                            onClick={onInvite}
                            disabled={!canInviteMore || inviting || !email}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all shrink-0 ${
                                canInviteMore && email
                                    ? 'bg-[#2C97D4] hover:bg-[#2286be] text-white shadow-sm hover:shadow-md'
                                    : 'bg-borderlight text-texttert cursor-not-allowed'
                            }`}
                        >
                            <UserPlus size={14} />
                            {inviting ? 'Inviting…' : 'Invite'}
                        </button>
                    </div>
                    {!canInviteMore && (
                        <p className="text-xs text-error mt-2">
                            Member limit reached. Upgrade your plan to add more collaborators.
                        </p>
                    )}
                </div>

                {/* Members header */}
                <div className="flex items-center gap-2 px-5 py-3 bg-appbg border-b border-border">
                    <Users size={15} className="text-textsec" />
                    <h3 className="text-sm font-semibold text-textpri" style={{ fontFamily: "'Syne', 'Inter', sans-serif" }}>
                        Team Members
                    </h3>
                    <span className="ml-auto text-xs font-medium bg-surface border border-border text-textsec px-2 py-0.5 rounded-full">
                        {members.length}
                    </span>
                </div>

                {members.length === 0 ? (
                    <div className="px-5 py-8 text-center">
                        <p className="text-sm text-textsec">No teammates yet — invite someone above.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {members.map((m) => (
                            <div key={m.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-appbg transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-sm font-semibold text-brand">
                                        {(m.name || m.email)[0]?.toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-textpri">{m.name || '—'}</div>
                                        <div className="text-xs text-texttert">{m.email}</div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {/* Role badge */}
                                    <span className={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${roleColor(m.role)}`}>
                                        {roleIcon(m.role)}
                                        {m.role}
                                    </span>

                                    {/* Pending badge */}
                                    {m.status === 'Pending' && (
                                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200">
                                            Pending
                                        </span>
                                    )}

                                    {/* Role dropdown (Owner cannot be changed) */}
                                    {m.role !== 'Owner' && (
                                        <select
                                            className="bg-appbg border border-border rounded-lg text-xs text-textpri px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/40 transition-all"
                                            value={m.role}
                                            onChange={async (e) => {
                                                const nextRole = e.target.value;
                                                const ok = await updateRole?.(m.id, nextRole);
                                                if (ok) setMembers(prev => prev.map(x => x.id === m.id ? { ...x, role: nextRole } : x));
                                            }}
                                        >
                                            <option value="Member">Member</option>
                                            <option value="Admin">Admin</option>
                                        </select>
                                    )}

                                    {/* Remove */}
                                    {m.role !== 'Owner' && (
                                        <button
                                            className="text-xs px-2.5 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors font-medium"
                                            onClick={async () => {
                                                const ok = await removeMember?.(m.id);
                                                if (ok) setMembers(prev => prev.filter(x => x.id !== m.id));
                                            }}
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

