import mongoose from 'mongoose';

const ContractorPerformanceSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  contractorName: { type: String },
  totalActivities: { type: Number, default: 0 },
  delayedActivities: { type: Number, default: 0 },
  totalDelayDays: { type: Number, default: 0 },
  incidents: { type: Number, default: 0 },
  reworkCount: { type: Number, default: 0 },
  // Derived — recomputed in pre('save'). Do not set manually.
  avgDelayDays: { type: Number, default: 0 },
  incidentRate: { type: Number, default: 0 },
  reworkFrequency: { type: Number, default: 0 },
}, { strict: true, timestamps: true });

// Derived fields: avgDelayDays, incidentRate, reworkFrequency are recomputed on every save.
// Guard: totalActivities === 0 short-circuits all calculations to avoid divide-by-zero.
// Guard: delayedActivities === 0 sets avgDelayDays to 0 to avoid divide-by-zero.
ContractorPerformanceSchema.pre('save', function (next) {
  if (this.totalActivities > 0) {
    this.avgDelayDays = this.delayedActivities > 0
      ? this.totalDelayDays / this.delayedActivities
      : 0;
    this.incidentRate    = this.incidents   / this.totalActivities;
    this.reworkFrequency = this.reworkCount / this.totalActivities;
  } else {
    this.avgDelayDays    = 0;
    this.incidentRate    = 0;
    this.reworkFrequency = 0;
  }
  next();
});

export default mongoose.model('ContractorPerformance', ContractorPerformanceSchema);
