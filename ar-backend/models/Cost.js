import mongoose from 'mongoose';

const STATUS_VALUES = ['Not Started', 'In Progress', 'Completed', 'Delayed', 'On Hold'];

const CostSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  phase: { type: String },
  description: { type: String, default: '' },
  plannedCost: { type: Number, required: true, default: 0 },
  actualCost: { type: Number, required: true, default: 0 },
  // Derived — recomputed in pre('save'). Do not set manually.
  costVariance: { type: Number, default: 0 },
  costVariancePercent: { type: Number, default: 0 },
  status: { type: String, enum: STATUS_VALUES, default: 'Not Started' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { strict: true, timestamps: true });

CostSchema.index({ projectId: 1, phase: 1 });
CostSchema.index({ costVariancePercent: 1 });

// Derived fields: costVariance and costVariancePercent are recomputed on every save.
// Guards: NaN-safe; divide-by-zero when plannedCost === 0 yields 0%.
CostSchema.pre('save', function (next) {
  const planned = this.plannedCost ?? 0;
  const actual  = this.actualCost  ?? 0;
  this.costVariance = actual - planned;
  this.costVariancePercent = planned !== 0
    ? (this.costVariance / planned) * 100
    : 0;
  if (!Number.isFinite(this.costVariancePercent)) this.costVariancePercent = 0;
  next();
});

export default mongoose.model('Cost', CostSchema);
