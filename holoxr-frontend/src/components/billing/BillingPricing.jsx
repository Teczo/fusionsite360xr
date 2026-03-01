import { useState } from "react";
import { CheckIcon } from '@heroicons/react/20/solid'
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

    const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/billing/create-checkout-session`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ planKey: String(planKey).toUpperCase() }),
        }
    );

    const data = await res.json();

    if (!res.ok || !data.url) {
        console.error('Checkout error:', data);
        alert(data?.error || 'Failed to start checkout');
        return;
    }

    window.location.href = data.url;
}

export default function BillingPricing() {
    const [loadingKey, setLoadingKey] = useState(null)

    return (
        <div className="px-6 py-20">
            <div className="mx-auto max-w-5xl">

                <CurrentPlanBanner />

                {/* Header */}
                <div className="mx-auto max-w-3xl text-center">
                    <h2 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                        Choose the right plan for you
                    </h2>
                    <p className="mt-4 text-lg text-gray-600">
                        Simple, transparent pricing for building and sharing immersive AR experiences.
                    </p>
                </div>

                {/* Pricing Grid */}
                <div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-2">
                    {PLANS.map((tier) => (
                        <div
                            key={tier.id}
                            className={classNames(
                                "flex flex-col justify-between rounded-2xl border p-10",
                                tier.featured
                                    ? "border-indigo-600 shadow-xl ring-1 ring-indigo-600/10"
                                    : "border-gray-200"
                            )}
                        >
                            {/* Plan Name */}
                            <div>
                                <h3 className="text-sm font-semibold text-indigo-600">
                                    {tier.name}
                                </h3>

                                {/* Price */}
                                <div className="mt-4 flex items-baseline gap-x-2">
                                    <span className="text-5xl font-bold text-gray-900">
                                        ${tier.priceMonthly}
                                    </span>
                                    <span className="text-base text-gray-500">
                                        /month
                                    </span>
                                </div>

                                {/* Description */}
                                <p className="mt-6 text-base text-gray-600">
                                    {tier.description}
                                </p>

                                {/* Features */}
                                <ul role="list" className="mt-8 space-y-4 text-sm text-gray-600">
                                    {tier.features.map((feature) => (
                                        <li key={feature} className="flex items-start gap-x-3">
                                            <CheckIcon
                                                aria-hidden="true"
                                                className="h-5 w-5 flex-none text-indigo-600"
                                            />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Button */}
                            <div>
                                <button
                                    aria-describedby={tier.id}
                                    disabled={loadingKey === tier.key}
                                    onClick={async () => {
                                        try {
                                            setLoadingKey(tier.key)
                                            await startCheckout(tier.key)
                                        } finally {
                                            setLoadingKey(null)
                                        }
                                    }}
                                    className={classNames(
                                        "mt-10 w-full rounded-lg px-4 py-3 text-sm font-semibold transition",
                                        tier.featured
                                            ? "bg-indigo-600 text-white hover:bg-indigo-500"
                                            : "border border-gray-300 text-gray-900 hover:bg-gray-50"
                                    )}
                                >
                                    {loadingKey === tier.key
                                        ? 'Redirecting…'
                                        : 'Get started today'}
                                </button>

                                {tier.key === 'founding' && (
                                    <p className="mt-4 text-xs text-gray-500">
                                        *Founding price is grandfathered for as long as the subscription remains active and in good standing.
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}