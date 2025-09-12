import express from "express";
import Stripe from "stripe";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

router.post("/create-checkout-session", authMiddleware, async (req, res) => {
    try {
        const { priceId } = req.body;
        const session = await stripe.checkout.sessions.create({
            mode: "subscription",
            line_items: [{ price: priceId, quantity: 1 }],
            customer_email: req.userEmail, // or look up User by req.userId
            success_url: `${process.env.APP_URL}/dashboard?billing=success`,
            cancel_url: `${process.env.APP_URL}/dashboard?billing=cancelled`,
        });
        res.json({ url: session.url });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create session" });
    }
});

export default router;
