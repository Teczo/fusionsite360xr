// routes/analyticsRead.js
import express from "express";
import { AnalyticsEvent } from "../models/AnalyticsEvent.js";
const router = express.Router();

const lastNDays = (n = 30) => {
    const d = new Date(); d.setUTCDate(d.getUTCDate() - n);
    return d;
};

// KPI + daily views + engagement funnel
router.get("/overview", async (req, res) => {
    const since = lastNDays(30);

    const [views, uniques, sessions, daily, funnel] = await Promise.all([
        AnalyticsEvent.countDocuments({ eventName: "scene_loaded", ts: { $gte: since } }),
        AnalyticsEvent.distinct("sessionId", { eventName: "scene_loaded", ts: { $gte: since } }).then(a => a.length),
        AnalyticsEvent.aggregate([
            { $match: { eventName: "session_ended", ts: { $gte: since } } },
            { $group: { _id: "$sessionId", dur: { $avg: "$meta.durationMs" } } },
            { $group: { _id: null, avg: { $avg: "$dur" } } }
        ]).then(r => r[0]?.avg || 0),

        // daily
        AnalyticsEvent.aggregate([
            { $match: { eventName: "scene_loaded", ts: { $gte: since } } },
            { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$ts" } }, views: { $sum: 1 } } },
            { $sort: { "_id": 1 } }
        ]),

        // funnel Opened → Placed → Interacted → Quiz → Button
        Promise.all([
            AnalyticsEvent.countDocuments({ eventName: "project_opened", ts: { $gte: since } }),
            AnalyticsEvent.countDocuments({ eventName: "scene_loaded", ts: { $gte: since } }),
            AnalyticsEvent.countDocuments({ eventName: "object_interacted", ts: { $gte: since } }),
            AnalyticsEvent.countDocuments({ eventName: "quiz_started", ts: { $gte: since } }),
            AnalyticsEvent.countDocuments({ eventName: "button_clicked", ts: { $gte: since } }),
        ]).then(([a, b, c, d, e]) => ([
            { name: "Opened", value: a },
            { name: "Placed", value: b },
            { name: "Interacted", value: c },
            { name: "Quiz", value: d },
            { name: "Button", value: e },
        ])),
    ]);

    res.json({
        totals: { views, uniques, avgSessionMs: Math.round(sessions || 0) },
        daily: daily.map((d, i) => ({ day: d._id, views: d.views })),
        funnel
    });
});

// GET /api/analytics/projects/:projectId
router.get("/projects/:projectId", async (req, res) => {
    const { projectId } = req.params;
    const since = lastNDays(30);

    const views = await AnalyticsEvent.countDocuments({ projectId, eventName: "scene_loaded", ts: { $gte: since } });

    // crude retention: % sessions still active at each 10s bucket (requires durationMs in session_ended)
    const retentionRaw = await AnalyticsEvent.aggregate([
        { $match: { projectId, eventName: "session_ended", ts: { $gte: since }, "meta.durationMs": { $gt: 0 } } },
        { $project: { bucket: { $floor: { $divide: ["$meta.durationMs", 10000] } } } }, // 10s
        { $group: { _id: "$bucket", c: { $sum: 1 } } },
        { $sort: { _id: 1 } }
    ]);
    const total = retentionRaw.reduce((a, b) => a + b.c, 0) || 1;
    const cum = [];
    let remain = total;
    for (let i = 0; i < retentionRaw.length; i++) {
        cum.push({ t: retentionRaw[i]._id * 10, pct: Math.round((remain / total) * 100) });
        remain -= retentionRaw[i].c;
    }

    const objects = await AnalyticsEvent.aggregate([
        { $match: { projectId, ts: { $gte: since }, objectId: { $exists: true, $ne: null } } },
        {
            $group: {
                _id: "$objectId",
                taps: { $sum: { $cond: [{ $eq: ["$eventName", "object_interacted"] }, 1, 0] } },
                avgViewSec: { $avg: { $cond: [{ $eq: ["$eventName", "object_viewed"] }, "$meta.durationMs", null] } },
                attempts: { $sum: { $cond: [{ $eq: ["$eventName", "quiz_started"] }, 1, 0] } },
                correct: { $sum: { $cond: [{ $and: [{ $eq: ["$eventName", "quiz_answered"] }, "$meta.quizCorrect"] }, 1, 0] } },
                clicks: { $sum: { $cond: [{ $eq: ["$eventName", "button_clicked"] }, 1, 0] } },
            }
        },
    ]);

    const objectRows = objects.map(o => ({
        id: o._id,
        label: o._id,
        taps: o.taps,
        avgViewSec: o.avgViewSec ? Math.round((o.avgViewSec || 0) / 1000) : 0,
        correctRate: o.attempts ? (o.correct / o.attempts) : undefined,
        ctr: undefined, // compute if you log impressions for buttons
    }));

    res.json({ name: projectId, views, retention: cum, objects: objectRows });
});

// GET /api/analytics/audience?projectId=optional
router.get("/audience", async (req, res) => {
    const since = lastNDays(30);
    const q = { eventName: "scene_loaded", ts: { $gte: since } };
    if (req.query.projectId) q.projectId = req.query.projectId;

    const devices = await AnalyticsEvent.aggregate([
        { $match: q },
        { $group: { _id: "$meta.platform", c: { $sum: 1 } } }
    ]);

    // new vs returning by session history
    const sessions = await AnalyticsEvent.aggregate([
        { $match: q },
        { $group: { _id: "$sessionId", first: { $min: "$ts" } } },
        { $group: { _id: null, total: { $sum: 1 }, new: { $sum: { $cond: [{ $gte: ["$first", since] }, 1, 0] } } } }
    ]);
    const total = sessions[0]?.total || 0;
    const n = sessions[0]?.new || 0;
    res.json({
        devices: devices.map(d => ({ name: d._id || "Unknown", value: d.c })),
        newReturning: [{ label: "New", value: n }, { label: "Returning", value: Math.max(0, total - n) }]
    });
});

// GET /api/analytics/engagement/:projectId
router.get("/engagement/:projectId", async (req, res) => {
    const { projectId } = req.params;
    const since = lastNDays(30);

    const quiz = await AnalyticsEvent.aggregate([
        { $match: { projectId, ts: { $gte: since }, eventName: { $in: ["quiz_started", "quiz_answered"] } } },
        { $project: { q: "$meta.quizId", correct: "$meta.quizCorrect", eventName: 1 } },
        {
            $group: {
                _id: "$q",
                attempts: { $sum: { $cond: [{ $eq: ["$eventName", "quiz_started"] }, 1, 0] } },
                correct: { $sum: { $cond: ["$correct", 1, 0] } }
            }
        }
    ]);

    const ctas = await AnalyticsEvent.aggregate([
        { $match: { projectId, ts: { $gte: since }, eventName: "button_clicked" } },
        { $group: { _id: "$meta.ctaId", clicks: { $sum: 1 } } }
    ]);

    res.json({
        quiz: quiz.map(q => ({ quizId: q._id, attempts: q.attempts, correctRate: q.attempts ? q.correct / q.attempts : 0 })),
        ctas: ctas.map(c => ({ ctaId: c._id, clicks: c.clicks }))
    });
});




export default router;
