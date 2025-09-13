import express from 'express';
import { stripe } from '../lib/stripe.js';
import mongoose from 'mongoose';
import User from '../models/User.js';

const router = express.Router();

// Use raw body ONLY for this route
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET; // set from Dashboard or Stripe CLI
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
                const subscriptionId = session.subscription;
                const customerId = session.customer;
                // Look up the subscription to get price and period end
                const sub = await stripe.subscriptions.retrieve(subscriptionId);
                const priceId = sub.items.data[0]?.price?.id;
                const status = sub.status;
                const currentPeriodEnd = new Date(sub.current_period_end * 1000);
                let planKey;
                if (priceId === process.env.VITE_STRIPE_PRICE_SINGLE) planKey = 'SINGLE';
                if (priceId === process.env.VITE_STRIPE_PRICE_FOUNDING) planKey = 'FOUNDING';

                // Find user by email or by a stored mapping you maintain.
                // If you included userId in metadata, fetch it that way instead.
                const email = session.customer_details?.email || session.customer_email;
                const user = await User.findOne({ email });
                if (!user) break;

                user.billing = {
                    ...(user.billing || {}),
                    stripeCustomerId: customerId,
                    stripeSubscriptionId: subscriptionId,
                    priceId,
                    planKey,
                    status,
                    currentPeriodEnd,
                    cancelAtPeriodEnd: sub.cancel_at_period_end || false,
                };
                await user.save();
                break;
            }
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted': {
                const sub = event.data.object;
                const customerId = sub.customer;
                const priceId = sub.items.data[0]?.price?.id;
                const status = sub.status;
                const currentPeriodEnd = new Date(sub.current_period_end * 1000);

                const user = await User.findOne({ 'billing.stripeCustomerId': customerId });
                if (!user) break;

                user.billing = {
                    ...(user.billing || {}),
                    stripeCustomerId: customerId,
                    stripeSubscriptionId: sub.id,
                    priceId,
                    status,
                    currentPeriodEnd,
                    cancelAtPeriodEnd: sub.cancel_at_period_end || false,
                };
                await user.save();
                break;
            }
            default:
                // ignore others for now
                break;
        }

        res.json({ received: true });
    } catch (e) {
        console.error('Webhook handler failed:', e);
        res.status(500).send('Webhook handler failed');
    }
});

export default router;
