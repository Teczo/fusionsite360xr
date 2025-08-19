// routes/analytics.js
import express from "express";
import AnalyticsEvent from "../models/AnalyticsEvent.js";

const router = express.Router();

// Parse range like: "30" (days), "7d", "4w", "3m", "1y"
function parseRange(range = "7") {
    const now = new Date();
    const end = now;
    const n = parseInt(range, 10);
    const unit = (range || "").replace(String(n), "").trim().toLowerCase();

    const start = new Date(now);
    if (!unit || unit === "d") start.setDate(now.getDate() - (isNaN(n) ? 7 : n));
    else if (unit === "w") start.setDate(now.getDate() - 7 * n);
    else if (unit === "m") start.setMonth(now.getMonth() - n);
    else if (unit === "y") start.setFullYear(now.getFullYear() - n);
    else start.setDate(now.getDate() - 7);
    return { start, end };
}

// Normalize body from text/plain or application/json
function readBody(req) {
    if (typeof req.body === "string") {
        try { return JSON.parse(req.body); } catch { return { raw: req.body }; }
    }
    return req.body || {};
}

// --- Track (POST /api/analytics/track) ---
router.post("/track", async (req, res) => {
    const b = readBody(req);
    // Minimal required fields
    const doc = {
        ts: new Date(b.ts || Date.now()),
        event: b.event || "unknown",
        projectId: b.projectId || null,
        sessionId: b.sessionId || null,
        ua: b.ua || null,
        platform: b.platform || null,
        lang: b.lang || null,
        ref: b.ref || null,
        payload: b,
    };
    try {
        await AnalyticsEvent.create(doc);
        res.sendStatus(204);
    } catch (e) {
        console.error("analytics track error:", e);
        res.sendStatus(500);
    }
});

// --- Overview (GET /api/analytics/overview?range=30) ---
router.get("/overview", async (req, res) => {
    const { range = "7" } = req.query;
    const { start, end } = parseRange(range);

    const [totals] = await AnalyticsEvent.aggregate([
        { $match: { ts: { $gte: start, $lte: end } } },
        {
            $group: {
                _id: null,
                totalEvents: { $sum: 1 },
                uniqueSessionsSet: { $addToSet: "$sessionId" },
                activeProjectsSet: { $addToSet: "$projectId" },
            },
        },
        {
            $project: {
                _id: 0,
                totalEvents: 1,
                uniqueSessions: { $size: "$uniqueSessionsSet" },
                activeProjects: { $size: "$activeProjectsSet" },
            },
        },
    ]);

    // simple session length from viewer_open -> session_end (optional)
    const sessions = await AnalyticsEvent.aggregate([
        { $match: { ts: { $gte: start, $lte: end }, event: { $in: ["viewer_open", "session_end"] } } },
        { $sort: { sessionId: 1, ts: 1 } },
        { $group: { _id: "$sessionId", first: { $first: "$ts" }, last: { $last: "$ts" } } },
        { $project: { _id: 0, durMs: { $subtract: ["$last", "$first"] } } },
    ]);
    const avgSessionMs = sessions.length
        ? Math.round(sessions.reduce((a, b) => a + (b.durMs || 0), 0) / sessions.length)
        : 0;

    // simple daily time series of events
    const daily = await AnalyticsEvent.aggregate([
        { $match: { ts: { $gte: start, $lte: end } } },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$ts" } },
                count: { $sum: 1 },
            },
        },
        { $sort: { _id: 1 } },
    ]);

    res.json({
        totalEvents: totals?.totalEvents || 0,
        uniqueSessions: totals?.uniqueSessions || 0,
        activeProjects: totals?.activeProjects || 0,
        avgSessionMs,
        daily, // [{ _id: "2025-08-19", count: N }, ...]
    });
});

// --- Audience (GET /api/analytics/audience?range=30[&projectId=...]) ---
router.get("/audience", async (req, res) => {
    const { range = "7", projectId } = req.query;
    const { start, end } = parseRange(range);
    const match = { ts: { $gte: start, $lte: end } };
    if (projectId) match.projectId = projectId;

    const [platforms, langs] = await Promise.all([
        AnalyticsEvent.aggregate([
            { $match: match },
            { $group: { _id: "$platform", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]),
        AnalyticsEvent.aggregate([
            { $match: match },
            { $group: { _id: "$lang", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]),
    ]);

    res.json({ platforms, langs });
});

// --- Project rollup (GET /api/analytics/projects/:projectId?range=30) ---
router.get("/projects/:projectId", async (req, res) => {
    const { projectId } = req.params;
    const { range = "7" } = req.query;
    const { start, end } = parseRange(range);

    const byEvent = await AnalyticsEvent.aggregate([
        { $match: { projectId, ts: { $gte: start, $lte: end } } },
        { $group: { _id: "$event", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
    ]);

    const daily = await AnalyticsEvent.aggregate([
        { $match: { projectId, ts: { $gte: start, $lte: end } } },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$ts" } },
                count: { $sum: 1 },
            },
        },
        { $sort: { _id: 1 } },
    ]);

    res.json({ projectId, events: byEvent, daily });
});

// --- Engagement (GET /api/analytics/engagement/:projectId?range=30) ---
router.get("/engagement/:projectId", async (req, res) => {
    const { projectId } = req.params;
    const { range = "7" } = req.query;
    const { start, end } = parseRange(range);

    const clicks = await AnalyticsEvent.aggregate([
        { $match: { projectId, ts: { $gte: start, $lte: end }, event: "button_click" } },
        { $group: { _id: "$payload.label", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
    ]);

    const quizzes = await AnalyticsEvent.aggregate([
        { $match: { projectId, ts: { $gte: start, $lte: end }, event: { $in: ["quiz_attempt", "quiz_result"] } } },
        { $group: { _id: "$event", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
    ]);

    res.json({ clicks, quizzes });
});

export default router;
