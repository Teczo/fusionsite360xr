import { useEffect, useState } from 'react';

export default function CurrentPlanBanner() {
    const [info, setInfo] = useState(null);

    useEffect(() => {
        (async () => {
            const r = await fetch(
                `${import.meta.env.VITE_API_URL}/api/billing/status`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                }
            );
            const data = await r.json();
            setInfo(data);
        })();
    }, []);

    if (!info?.status) return null;

    const planLabel =
        info.planKey === 'FOUNDING' ? 'Founding User' :
            info.planKey === 'SINGLE' ? 'Single' :
                info.priceId === import.meta.env.VITE_STRIPE_PRICE_FOUNDING ? 'Founding User' :
                    info.priceId === import.meta.env.VITE_STRIPE_PRICE_SINGLE ? 'Single' :
                        '—';

    const renews = info.currentPeriodEnd
        ? new Date(info.currentPeriodEnd).toLocaleDateString()
        : '';

    const isActive = info.status === 'active' || info.status === 'trialing';

    return (
        <div className="mb-10 rounded-2xl border border-gray-200 bg-gray-50 p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

                <div>
                    <div className="text-sm font-semibold text-gray-900">
                        Current plan: {planLabel}
                    </div>

                    <div className="mt-1 text-sm text-gray-600">
                        Status:{" "}
                        <span
                            className={
                                isActive
                                    ? "font-medium text-green-600"
                                    : "font-medium text-red-600"
                            }
                        >
                            {info.status}
                        </span>

                        {info.cancelAtPeriodEnd && (
                            <span className="text-gray-500">
                                {" "}· Cancels at period end
                            </span>
                        )}

                        {renews && (
                            <span className="text-gray-500">
                                {" "}· Renews on {renews}
                            </span>
                        )}
                    </div>
                </div>

                {/* Optional subtle badge */}
                {isActive && (
                    <div className="mt-3 sm:mt-0">
                        <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                            Active subscription
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}