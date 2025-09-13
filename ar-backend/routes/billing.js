import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { stripe } from '../lib/stripe.js';
import User from '../models/User.js';

const router = express.Router();

function mapPlanKeyToPrice(planKey) {
    const key = String(planKey || '').toUpperCase();
    if (key === 'FOUNDING') return process.env.VITE_STRIPE_PRICE_FOUNDING;
    if (key === 'SINGLE') return process.env.VITE_STRIPE_PRICE_SINGLE;
    return null;
}

router.post('/create-checkout-session', authMiddleware, async (req, res) => {
    try {
        const { planKey } = req.body;
        const price = mapPlanKeyToPrice(planKey);
        if (!price) return res.status(400).json({ error: 'Invalid planKey' });

        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Reuse customer if exists
        let customerId = user.billing?.stripeCustomerId;
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: { userId: String(user._id) },
            });
            customerId = customer.id;
            user.billing = { ...(user.billing || {}), stripeCustomerId: customerId };
            await user.save();
        }

        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            customer: customerId,
            line_items: [{ price, quantity: 1 }],
            success_url: `${process.env.APP_URL}/dashboard?billing=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.APP_URL}/dashboard?billing=cancelled`,
            allow_promotion_codes: true,
            automatic_tax: { enabled: false },
        });

        res.json({ url: session.url });
    } catch (e) {
        console.error('create-checkout-session error:', e);
        res.status(500).json({ error: 'Failed to create session' });
    }
});

router.post('/create-portal-session', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        const customerId = user?.billing?.stripeCustomerId;
        if (!customerId) return res.status(400).json({ error: 'No Stripe customer for user' });

        const portal = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${process.env.APP_URL}/dashboard`,
        });
        res.json({ url: portal.url });
    } catch (e) {
        console.error('create-portal-session error:', e);
        res.status(500).json({ error: 'Failed to create portal session' });
    }
});

router.get('/status', authMiddleware, async (req, res) => {
    const user = await User.findById(req.userId).select('billing');
    res.json(user?.billing || {});
});

router.get('/confirm', async (req, res) => {
    try {
        const { session_id } = req.query;
        if (!session_id) return res.status(400).json({ error: 'Missing session_id' });

        const session = await stripe.checkout.sessions.retrieve(session_id);
        if (!session?.customer || !session?.subscription) {
            return res.status(400).json({ error: 'Invalid session' });
        }

        const sub = await stripe.subscriptions.retrieve(session.subscription);
        const email = session.customer_details?.email || session.customer_email;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const priceId = sub.items.data[0]?.price?.id;
        const status = sub.status;
        const currentPeriodEnd = new Date(sub.current_period_end * 1000);

        // Optional: derive planKey from priceId
        let planKey = undefined;
        if (priceId === process.env.STRIPE_PRICE_SINGLE) planKey = 'SINGLE';
        if (priceId === process.env.STRIPE_PRICE_FOUNDING) planKey = 'FOUNDING';

        user.billing = {
            ...(user.billing || {}),
            stripeCustomerId: session.customer,
            stripeSubscriptionId: sub.id,
            priceId,
            planKey,
            status,
            currentPeriodEnd,
            cancelAtPeriodEnd: sub.cancel_at_period_end || false,
        };
        await user.save();

        res.json({ ok: true, status, planKey, currentPeriodEnd });
    } catch (e) {
        console.error('confirm error:', e);
        res.status(500).json({ error: 'Confirm failed' });
    }
});


export default router;
