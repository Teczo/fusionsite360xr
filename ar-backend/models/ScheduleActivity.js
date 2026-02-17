import mongoose from "mongoose";

const ScheduleActivitySchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  activityId: String,
  name: String,
  plannedStart: Date,
  plannedFinish: Date,
  actualStart: Date,
  actualFinish: Date,
  durationDays: Number,
  criticalPath: { type: Boolean, default: false },
  weatherSensitivity: String,
}, { timestamps: true });

ScheduleActivitySchema.index({ projectId: 1, plannedStart: 1 });

export default mongoose.model("ScheduleActivity", ScheduleActivitySchema);
