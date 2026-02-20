import mongoose from "mongoose";

const STATUS_VALUES = ['Not Started', 'In Progress', 'Completed', 'Delayed', 'On Hold'];

const ScheduleActivitySchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  // MIGRATION: default '' preserves compatibility with legacy documents that pre-date this field being required.
  activityId: { type: String, required: true, default: '' },
  name: String,
  status: { type: String, enum: STATUS_VALUES, default: 'Not Started' },
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
  predecessors: [{ type: String }],
  successors: [{ type: String }],
  dependencyType: {
    type: String,
    enum: ["FS", "SS", "FF"],
    default: "FS"
  },
}, { strict: true, timestamps: true });

// Compound indexes
ScheduleActivitySchema.index({ projectId: 1, plannedStart: 1 });   // pre-existing
ScheduleActivitySchema.index({ projectId: 1, activityId: 1 });
ScheduleActivitySchema.index({ projectId: 1, plannedFinish: 1 });
ScheduleActivitySchema.index({ status: 1 });

// Derived fields: delayDays and isDelayed are recomputed on every save.
// Guards: actualFinish missing → isDelayed = false; negative diff is clamped to 0.
ScheduleActivitySchema.pre('save', function (next) {
  if (this.plannedFinish && this.actualFinish) {
    const diff = this.actualFinish - this.plannedFinish;
    this.delayDays = Math.max(Math.ceil(diff / (1000 * 60 * 60 * 24)), 0);
    this.isDelayed = this.delayDays > 0;
  } else {
    this.isDelayed = false;
  }
  next();
});

export default mongoose.model("ScheduleActivity", ScheduleActivitySchema);
