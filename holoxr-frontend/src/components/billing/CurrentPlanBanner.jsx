import { useEffect, useState } from 'react';

export default function CurrentPlanBanner() {
    const [info, setInfo] = useState(null);

    useEffect(() => {
        (async () => {
            const r = await fetch(`${import.meta.env.VITE_API_URL}/api/billing/status`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });
            const data = await r.json();
            setInfo(data);
        })();
    }, []);

    if (!info?.status) return null;

    const planLabel =
        info.planKey === 'FOUNDING' ? 'Founding User' :
            info.planKey === 'SINGLE' ? 'Single' :
                info.priceId === import.meta.env.VITE_STRIPE_PRICE_FOUNDING ? 'Founding User' :
                    info.priceId === import.meta.env.VITE_STRIPE_PRICE_SINGLE ? 'Single' : '—';

    const renews = info.currentPeriodEnd ? new Date(info.currentPeriodEnd).toLocaleDateString() : '';

    return (
        <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white">
            <div className="font-semibold">Current plan: {planLabel}</div>
            <div className="text-gray-300">
                Status: {info.status}{info.cancelAtPeriodEnd ? ' (cancels at period end)' : ''}{renews ? ` · Renews on ${renews}` : ''}
            </div>
        </div>
    );
}
