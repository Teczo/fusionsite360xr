// components/team/TeamPanel.jsx
import { useEffect, useState } from 'react';

export default function TeamPanel({ userPlan = 'Free', planLimits = {}, fetchTeam, inviteUser, updateRole, removeMember }) {
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

    const rolePill = (role) => (
        <span className="text-[11px] px-2 py-0.5 rounded bg-white/5 border border-white/10">{role}</span>
    );

    const teamMax = Number.isFinite(planLimits?.teamMembers?.max)
        ? planLimits.teamMembers.max
        : Infinity;
    const activeMembers = members.filter(m => m.status !== 'Pending').length; // or include pending if you want
    const canInviteMore = activeMembers < teamMax;

    return (
        <div className="max-w-3xl mx-auto">
            <div className="mb-6">
                <h2 className="text-2xl font-semibold">Team</h2>
                <p className="text-textsec mt-1 text-sm">
                    Team member limit: {teamMax === Infinity ? 'Unlimited' : teamMax}
                    {typeof planLimits?.sharedProjects?.max !== 'undefined' && (
                        <> · Shared projects limit: {planLimits.sharedProjects.max === Infinity ? 'Unlimited' : planLimits.sharedProjects.max}</>
                    )}
                    {planLimits?.watermark && ' · Publishing shows watermark'}
                </p>
            </div>

            <div className="flex gap-2 mb-4">
                <input
                    type="email"
                    placeholder="Invite by email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 focus:outline-none"
                    disabled={!canInviteMore}
                />
                <button
                    onClick={onInvite}
                    disabled={!canInviteMore || inviting}
                    className={`px-4 py-2 rounded-lg ${canInviteMore ? 'bg-brand text-black hover:bg-brand-600' : 'bg-white/10 text-textsec cursor-not-allowed'}`}
                >
                    {inviting ? 'Inviting…' : 'Invite'}
                </button>
            </div>

            {!canInviteMore && (
                <div className="text-xs text-textsec mb-3">
                    Upgrade to Pro to add more collaborators.
                </div>
            )}

            <div className="divide-y divide-white/10 rounded-xl border border-white/10 overflow-hidden">
                {members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between p-3 bg-surface/50">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/10 grid place-items-center">{(m.name || m.email)[0]?.toUpperCase()}</div>
                            <div>
                                <div className="text-title text-sm font-medium">{m.name || '—'}</div>
                                <div className="text-xs text-textsec">{m.email}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {rolePill(m.role)}
                            {m.status === 'Pending' && rolePill('Pending')}
                            {/* role dropdown (Owner cannot be changed) */}
                            {m.role !== 'Owner' && (
                                <select
                                    className="bg-black/30 border border-white/10 rounded-lg text-sm px-2 py-1"
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
                            {m.role !== 'Owner' && (
                                <button
                                    className="text-xs px-2 py-1 rounded bg-red-700 hover:bg-red-600"
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

                {members.length === 0 && (
                    <div className="p-6 text-center text-textsec">Invite teammates to get started.</div>
                )}
            </div>
        </div>
    );
}
