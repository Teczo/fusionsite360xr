import express from 'express';
import { stripe } from '../lib/stripe.js';
import User from '../models/User.js';

const router = express.Router();

// helper: safely convert Stripe’s UNIX seconds to JS Date
function safeUnixToDate(sec) {
    if (!sec || Number.isNaN(Number(sec))) return null;
    return new Date(Number(sec) * 1000);
}

// Use raw body ONLY for this route
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.error('Webhook signature verify failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                try {
                    const subscriptionId = session.subscription;
                    const customerId = session.customer;
                    const email = session.customer_details?.email || session.customer_email;

                    console.log('[webhook] session.completed', {
                        subscriptionId, customerId, email,
                    });

                    if (!subscriptionId || !customerId) {
                        console.warn('[webhook] missing subscription/customer on session.completed');
                        break;
                    }

                    const sub = await stripe.subscriptions.retrieve(subscriptionId);
                    const priceId = sub.items?.data?.[0]?.price?.id;
                    const status = sub.status;
                    const currentPeriodEnd = safeUnixToDate(sub.current_period_end);

                    console.log('[webhook] subscription snapshot', {
                        priceId, status, rawEnd: sub.current_period_end, currentPeriodEnd,
                    });

                    // Find user by customerId or email
                    let user = await User.findOne({ 'billing.stripeCustomerId': customerId });
                    if (!user && email) {
                        user = await User.findOne({ email });
                        if (user && !user.billing?.stripeCustomerId) {
                            user.billing = { ...(user.billing || {}), stripeCustomerId: customerId };
                        }
                    }
                    if (!user) { console.warn('[webhook] no user found'); break; }

                    let planKey;
                    if (priceId === process.env.STRIPE_PRICE_SINGLE) planKey = 'SINGLE';
                    if (priceId === process.env.STRIPE_PRICE_FOUNDING) planKey = 'FOUNDING';

                    user.billing = {
                        ...(user.billing || {}),
                        stripeCustomerId: customerId,
                        stripeSubscriptionId: sub.id,
                        priceId,
                        planKey,
                        status,
                        ...(currentPeriodEnd ? { currentPeriodEnd } : {}),
                        cancelAtPeriodEnd: sub.cancel_at_period_end || false,
                    };
                    await user.save();

                    console.log('[webhook] user billing updated OK', {
                        userId: String(user._id), status, planKey,
                    });
                } catch (e) {
                    console.error('[webhook] session.completed failed:', e);
                }
                break;
            }

            case 'customer.subscription.created':
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted': {
                const sub = event.data.object;
                const customerId = sub.customer;
                const priceId = sub.items?.data?.[0]?.price?.id;
                const status = sub.status;
                const currentPeriodEnd = safeUnixToDate(sub.current_period_end);

                let user = await User.findOne({ 'billing.stripeCustomerId': customerId });
                if (!user) { console.warn('[webhook] no user for subscription.*', { customerId }); break; }

                let planKey;
                if (priceId === process.env.STRIPE_PRICE_SINGLE) planKey = 'SINGLE';
                if (priceId === process.env.STRIPE_PRICE_FOUNDING) planKey = 'FOUNDING';

                user.billing = {
                    ...(user.billing || {}),
                    stripeCustomerId: customerId,
                    stripeSubscriptionId: sub.id,
                    priceId,
                    planKey,
                    status,
                    ...(currentPeriodEnd ? { currentPeriodEnd } : {}),
                    cancelAtPeriodEnd: sub.cancel_at_period_end || false,
                };
                await user.save();

                console.log('[webhook] subscription.* updated user', {
                    userId: String(user._id), status, planKey,
                });
                break;
            }

            default:
                // ignore others
                break;
        }

        res.json({ received: true });
    } catch (e) {
        console.error('Webhook handler failed:', e);
        res.status(500).send('Webhook handler failed');
    }
});

export default router;
