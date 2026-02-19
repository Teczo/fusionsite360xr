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
  plannedDurationDays: { type: Number, default: 0 },
  delayDays: { type: Number, default: 0 },
  isDelayed: { type: Boolean, default: false },
  criticalPath: { type: Boolean, default: false },
  weatherSensitivity: String,
  predecessors: [
    {
      type: String
    }
  ],
  successors: [
    {
      type: String
    }
  ],
  dependencyType: {
    type: String,
    enum: ["FS", "SS", "FF"],
    default: "FS"
  },
}, { timestamps: true });

ScheduleActivitySchema.index({ projectId: 1, plannedStart: 1 });

export default mongoose.model("ScheduleActivity", ScheduleActivitySchema);
