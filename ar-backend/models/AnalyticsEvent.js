// models/AnalyticsEvent.js
import mongoose from "mongoose";

const AnalyticsEventSchema = new mongoose.Schema(
    {
        ts: { type: Date, required: true, index: true },
        event: { type: String, required: true, index: true },
        projectId: { type: String, index: true },
        sessionId: { type: String, index: true },
        ua: String,
        platform: String,
        lang: String,
        ref: String,
        payload: mongoose.Schema.Types.Mixed, // keep raw body too
    },
    { strict: false }
);

export default mongoose.model("AnalyticsEvent", AnalyticsEventSchema);
