import { useState } from "react";
import { Check } from 'lucide-react';
import CurrentPlanBanner from './CurrentPlanBanner';

// Two plans mapped to your Stripe Price IDs (from Vite env)
const PLANS = [
    {
        key: 'single',
        id: 'tier-single',
        name: 'Single',
        priceMonthly: 9.99,
        priceId: import.meta.env.VITE_STRIPE_PRICE_SINGLE,
        description: "Everything to start building AR scenes.",
        features: [
            '1 seat',
            'Unlimited projects',
            'Upload & host assets',
            'Basic analytics',
            'Community templates',
        ],
        featured: false,
    },
    {
        key: 'founding',
        id: 'tier-founding',
        name: 'Founding User',
        priceMonthly: 5.0,
        priceId: import.meta.env.VITE_STRIPE_PRICE_FOUNDING,
        description: 'Early supporters price, locked forever*',
        features: [
            'All Single plan features',
            'Founding badge on profile',
            'Priority feature voting',
        ],
        featured: true,
    },
]

function classNames(...classes) {
    return classes.filter(Boolean).join(' ')
}

async function startCheckout(planKey) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/billing/create-checkout-session`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planKey: String(planKey).toUpperCase() }), // 👈 key normalized
    });
    const data = await res.json();
    if (!res.ok || !data.url) {
        console.error('Checkout error:', data); // helpful log
        alert(data?.error || 'Failed to start checkout');
        return;
    }
    window.location.href = data.url;
}


export default function BillingPricing() {
    const [loadingKey, setLoadingKey] = useState(null)

    return (
        <div className="relative isolate px-4 py-10 sm:py-12 lg:px-8 text-white">
            <CurrentPlanBanner />
            {/* Soft gradient blobs (contained so they don’t break your dashboard) */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -top-10 -z-10 overflow-hidden blur-3xl">
                <div
                    className="mx-auto h-64 w-[40rem] bg-gradient-to-tr from-[#6ea8ff] to-[#a78bfa] opacity-20"
                    style={{ clipPath: 'polygon(74% 44%, 100% 62%, 98% 27%, 86% 0%, 81% 2%, 73% 33%, 60% 62%, 52% 68%, 48% 58%, 45% 35%, 28% 77%, 0% 65%, 18% 100%, 28% 77%, 76% 98%, 74% 44%)' }}
                />
            </div>

            <div className="mx-auto max-w-4xl text-center">
                <p className="mt-2 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">Choose the right plan for you</p>
                <p className="mx-auto mt-4 max-w-2xl text-base text-textsec">
                    Choose an affordable plan packed with the essentials for building and sharing AR experiences.
                </p>
            </div>

            <div className="mx-auto mt-10 grid max-w-4xl grid-cols-1 items-stretch gap-y-6 sm:mt-12 lg:grid-cols-2 lg:gap-x-6">
                {PLANS.map((tier, idx) => (
                    <div
                        key={tier.id}
                        className={classNames(
                            tier.featured ? 'relative bg-zinc-900/70 ring-1 ring-white/10' : 'bg-surface/5 ring-1 ring-white/10',
                            idx === 0 ? 'rounded-t-3xl lg:rounded-tr-none lg:rounded-bl-3xl' : 'rounded-b-3xl lg:rounded-tr-3xl lg:rounded-bl-none',
                            'rounded-3xl p-8 sm:p-10 backdrop-blur-md border border-white/10'
                        )}
                    >
                        <h3 id={tier.id} className="text-base font-semibold text-accent">{tier.name}</h3>

                        <p className="mt-4 flex items-baseline gap-x-2">
                            <span className="text-5xl font-semibold tracking-tight">
                                ${tier.priceMonthly}
                            </span>
                            <span className="text-base text-texttert">/month</span>
                        </p>

                        <p className="mt-6 text-base text-textsec">{tier.description}</p>

                        <ul role="list" className="mt-8 space-y-3 text-sm text-textsec sm:mt-10">
                            {tier.features.map((feature) => (
                                <li key={feature} className="flex gap-x-3">
                                    <Check aria-hidden="true" className="h-5 w-5 flex-none text-brand" />
                                    {feature}
                                </li>
                            ))}
                        </ul>

                        <button
                            aria-describedby={tier.id}
                            disabled={loadingKey === tier.key}
                            onClick={async () => {
                                try {
                                    setLoadingKey(tier.key)
                                    await startCheckout(tier.key)   // 👈 now uses key
                                } finally {
                                    setLoadingKey(null)
                                }
                            }}
                            className={classNames(
                                'mt-8 block w-full rounded-md px-3.5 py-2.5 text-center text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 sm:mt-10 transition',
                                tier.featured
                                    ? 'w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold btn-gradient-primary'
                                    : 'bg-surface/10 text-white ring-1 ring-white/10 hover:bg-surface/20 focus-visible:outline-white/75'
                            )}
                        >
                            {loadingKey === tier.key ? 'Redirecting…' : 'Get started today'}
                        </button>

                        {tier.key === 'founding' && (
                            <p className="mt-3 text-[11px] leading-snug text-texttert">
                                *Founding price is grandfathered for as long as the subscription remains active and in good standing.
                            </p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}