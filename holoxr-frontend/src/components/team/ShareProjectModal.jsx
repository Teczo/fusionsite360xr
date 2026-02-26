// components/sharing/ShareProjectModal.jsx
import { useEffect, useMemo, useState } from 'react';

export default function ShareProjectModal({
    open,
    onClose,
    project,
    loadAccessList,     // () => Promise<[{id, name, email, permission, fromTeam, status}]>
    searchTeam,         // (q) => Promise<[{id, name, email}]>
    inviteToProject,    // (emailOrUserId, permission) => Promise<row>
    updatePermission,   // (userId, permission) => Promise<boolean>
    removeAccess,       // (userId) => Promise<boolean>
    planLimits,  // plan banners
    sharedCount = 0,    // number of active shared projects
}) {
    const [query, setQuery] = useState('');
    const [suggest, setSuggest] = useState([]);
    const [rows, setRows] = useState([]);
    const [busy, setBusy] = useState(false);
    const maxShared = Number.isFinite(planLimits?.sharedProjects?.max) ? planLimits.sharedProjects.max : Infinity;
    const freeLimitHit = (maxShared !== Infinity) && (sharedCount >= maxShared);

    useEffect(() => {
        if (!open) return;
        (async () => {
            const list = await loadAccessList?.();
            if (Array.isArray(list)) setRows(list);
        })();
    }, [open, loadAccessList]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!query) { setSuggest([]); return; }
            const res = await searchTeam?.(query);
            if (!cancelled) setSuggest(res || []);
        })();
        return () => { cancelled = true; };
    }, [query, searchTeam]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4">
            <div className="w-full max-w-lg bg-[#2c2e3a] border border-white/15 rounded-2xl shadow-2xl">
                <div className="p-4 border-b border-white/10">
                    <div className="text-lg font-semibold">Share “{project?.name}”</div>
                    <div className="text-xs text-textsec mt-1">Add people and set their permissions.</div>
                    {planLimits?.watermark && (
                        <div className="mt-2 text-[11px] text-textsec">
                            Publishing shows watermark · Shared projects limit: {maxShared === Infinity ? 'Unlimited' : maxShared}
                        </div>
                    )}
                </div>

                <div className="p-4 space-y-3">
                    {/* Add person */}
                    <div>
                        <div className="flex gap-2">
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search team or enter email"
                                className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 focus:outline-none"
                                disabled={freeLimitHit}
                            />
                            <select id="perm" className="bg-black/30 border border-white/10 rounded-lg text-sm px-2">
                                <option value="view">Can view</option>
                                <option value="edit">Can edit</option>
                            </select>
                            <button
                                className={`px-3 rounded-lg ${freeLimitHit ? 'bg-surface/10 text-textsec cursor-not-allowed' : 'bg-brand text-black hover:bg-brand-600'}`}
                                onClick={async () => {
                                    if (!query) return;
                                    if (freeLimitHit) return;
                                    setBusy(true);
                                    const perm = document.getElementById('perm').value;
                                    try {
                                        const added = await inviteToProject?.(query, perm);
                                        if (added) setRows((prev) => [added, ...prev]);
                                        setQuery('');
                                        setSuggest([]);
                                    } finally {
                                        setBusy(false);
                                    }
                                }}
                            >
                                Add
                            </button>
                        </div>

                        {/* suggestions dropdown */}
                        {suggest.length > 0 && (
                            <div className="mt-2 bg-black/40 border border-white/10 rounded-lg overflow-hidden">
                                {suggest.map((u) => (
                                    <button
                                        key={u.id}
                                        className="w-full text-left px-3 py-2 hover:bg-surface/10 text-sm"
                                        onClick={() => setQuery(u.email || u.name)}
                                    >
                                        {u.name} <span className="text-textsec">({u.email})</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {freeLimitHit && (
                            <div className="text-[11px] text-textsec mt-2">Upgrade to Pro to share more than 1 active project.</div>
                        )}
                    </div>

                    {/* access list */}
                    <div className="rounded-xl border border-white/10 overflow-hidden divide-y divide-white/10">
                        {rows.map((r) => (
                            <div key={r.id} className="flex items-center justify-between p-3 bg-surface/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-surface/10 grid place-items-center">{(r.name || r.email)[0]?.toUpperCase()}</div>
                                    <div>
                                        <div className="text-sm font-medium">{r.name || '—'}</div>
                                        <div className="text-xs text-textsec">{r.email}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <select
                                        className="bg-black/30 border border-white/10 rounded-lg text-sm px-2 py-1"
                                        value={r.permission}
                                        onChange={async (e) => {
                                            const ok = await updatePermission?.(r.id, e.target.value);
                                            if (ok) setRows(prev => prev.map(x => x.id === r.id ? { ...x, permission: e.target.value } : x));
                                        }}
                                    >
                                        <option value="view">Can view</option>
                                        <option value="edit">Can edit</option>
                                    </select>
                                    <button
                                        className="text-xs px-2 py-1 rounded bg-red-700 hover:bg-red-600"
                                        onClick={async () => {
                                            const ok = await removeAccess?.(r.id);
                                            if (ok) setRows(prev => prev.filter(x => x.id !== r.id));
                                        }}
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>
                        ))}
                        {rows.length === 0 && <div className="p-6 text-center text-textsec">No one has access yet.</div>}
                    </div>
                </div>

                <div className="p-4 border-t border-white/10 flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-surface/10 hover:bg-surface/15">Close</button>
                </div>
            </div>
        </div>
    );
}
