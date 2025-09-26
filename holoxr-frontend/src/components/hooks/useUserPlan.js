import { useEffect, useState } from 'react';

export default function useUserPlan() {
    const [state, setState] = useState({
        loading: true,
        plan: 'FREE',
        capabilitiesTier: 'FREE',
        limits: { watermark: true, sharedProjects: { max: 1 }, teamMembers: { max: 3 }, uploadSizeMB: 25 },
        profile: null,
        error: null,
    });

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) { setState(s => ({ ...s, loading: false, error: 'No token' })); return; }

        (async () => {
            try {
                const r = await fetch(`${import.meta.env.VITE_API_URL}/api/profile`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await r.json();
                if (!r.ok) throw new Error(data?.error || 'Failed profile');
                setState({
                    loading: false,
                    plan: data.plan,                         // 'FREE'|'SINGLE'|'FOUNDING'
                    capabilitiesTier: data.capabilitiesTier, // 'FREE'|'PRO'
                    limits: data.limits || {},
                    profile: data,
                    error: null,
                });
            } catch (e) {
                setState(s => ({ ...s, loading: false, error: String(e?.message || e) }));
            }
        })();
    }, []);

    return state;
}
