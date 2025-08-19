// routes/analyticsTrack.js
import express from "express";
import { AnalyticsEvent } from "../models/AnalyticsEvent.js";
import { v4 as uuid } from "uuid";

const router = express.Router();

router.post("/track", async (req, res) => {
    try {
        const b = req.body || {};
        const sessionId = b.sessionId || uuid();
        const doc = {
            eventName: b.eventName,
            projectId: b.projectId,
            objectId: b.objectId,
            userId: b.userId,
            sessionId,
            ts: new Date(),
            meta: b.meta || {},
        };
        await AnalyticsEvent.create(doc);
        res.json({ ok: true, sessionId });
    } catch (e) {
        console.error(e);
        res.status(400).json({ ok: false, error: "BAD_EVENT" });
    }
});

export default router;
