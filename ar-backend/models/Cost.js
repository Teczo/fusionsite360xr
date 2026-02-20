import mongoose from 'mongoose';

const costSchema = new mongoose.Schema({
  // Foreign key to the parent project
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },

  // Foreign key to the specific schedule activity this cost record belongs to
  activityId: { type: mongoose.Schema.Types.ObjectId, ref: 'ScheduleActivity', required: true, index: true },

  // Construction phase (e.g. 'Foundation', 'Structure', 'MEP') — used for phase-level budget aggregation (Q5)
  phase: { type: String, required: true, index: true },

  // Budgeted cost for this activity
  plannedCost: { type: Number, required: true },

  // Actual spend recorded against this activity; starts at 0 until actuals are posted
  actualCost: { type: Number, default: 0 },

  // Derived: absolute difference between actual and planned cost (positive = over budget)
  // Computed in pre-save hook; stored for queryability in overrun detection (Q13)
  costVariance: { type: Number },

  // Derived: costVariance expressed as a percentage of plannedCost
  // Stored for direct index-based threshold queries (e.g. >10% overrun)
  costVariancePercent: { type: Number },
}, { strict: true, timestamps: true });

// Supports phase-level budget aggregation queries (Q5)
costSchema.index({ projectId: 1, phase: 1 });

// Supports activity-level cost lookups
costSchema.index({ projectId: 1, activityId: 1 });

// Supports range queries for cost overrun detection (Q13), e.g. costVariancePercent > 10
costSchema.index({ costVariancePercent: 1 });

// Compute derived cost fields before every save
costSchema.pre('save', function (next) {
  this.costVariance = this.actualCost - this.plannedCost;
  // Guard against division by zero when plannedCost is 0
  this.costVariancePercent = this.plannedCost !== 0
    ? (this.costVariance / this.plannedCost) * 100
    : 0;
  next();
});

export default mongoose.model('Cost', costSchema);
