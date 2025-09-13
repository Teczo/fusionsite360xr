import User from '../models/User.js';

export default async function requireActiveSubscription(req, res, next) {
    try {
        const user = await User.findById(req.userId).select('billing');
        const b = user?.billing;
        const isActive = b && (b.status === 'active' || b.status === 'trialing');
        const stillWithinPeriod = b?.currentPeriodEnd ? new Date(b.currentPeriodEnd) > new Date() : false;

        // allow if active/trialing OR (cancel at period end but still within paid period)
        if (isActive || (b?.cancelAtPeriodEnd && stillWithinPeriod)) return next();

        return res.status(402).json({ error: 'Subscription required' });
    } catch (e) {
        return res.status(500).json({ error: 'Billing check failed' });
    }
}
