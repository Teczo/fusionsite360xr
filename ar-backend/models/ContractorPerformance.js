import mongoose from 'mongoose';

const contractorPerformanceSchema = new mongoose.Schema({
  // Foreign key to the Contractor entity whose performance this record summarises
  contractorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contractor', required: true, index: true },

  // Foreign key to the project on which this performance was measured
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },

  // --- Raw counters (source of truth for derived field recomputation) ---

  // Total number of activities assigned to this contractor on this project
  totalActivities: { type: Number, default: 0 },

  // Number of activities that were completed late
  delayedActivities: { type: Number, default: 0 },

  // Cumulative days of delay across all delayed activities
  totalDelayDays: { type: Number, default: 0 },

  // Total number of HSE/safety incidents attributed to this contractor
  incidents: { type: Number, default: 0 },

  // Total number of rework events attributed to this contractor
  reworkCount: { type: Number, default: 0 },

  // --- Derived ratio fields (computed in pre-save hook) ---

  // Derived: average delay per activity = totalDelayDays / totalActivities
  // Stored for direct index-based risk ranking (Q14)
  avgDelayDays: { type: Number, default: 0 },

  // Derived: incident rate per activity = incidents / totalActivities
  // Stored for portfolio-level risk scoring
  incidentRate: { type: Number, default: 0 },

  // Derived: rework frequency per activity = reworkCount / totalActivities
  // Stored for subcontractor performance analytics (Q14)
  reworkFrequency: { type: Number, default: 0 },
}, { strict: true, timestamps: true });

// Primary lookup index for Q14: fetch performance records for a specific contractor on a specific project
contractorPerformanceSchema.index({ contractorId: 1, projectId: 1 });

// Supports risk ranking: sort all contractors by average delay descending
contractorPerformanceSchema.index({ avgDelayDays: 1 });

// Supports risk scoring: sort all contractors by incident rate descending
contractorPerformanceSchema.index({ incidentRate: 1 });

// Compute all three derived ratio fields before every save
// All three use totalActivities as the denominator — guard against divide-by-zero
contractorPerformanceSchema.pre('save', function (next) {
  if (this.totalActivities > 0) {
    this.avgDelayDays    = this.totalDelayDays / this.totalActivities;
    this.incidentRate    = this.incidents      / this.totalActivities;
    this.reworkFrequency = this.reworkCount    / this.totalActivities;
  } else {
    this.avgDelayDays    = 0;
    this.incidentRate    = 0;
    this.reworkFrequency = 0;
  }
  next();
});

export default mongoose.model('ContractorPerformance', contractorPerformanceSchema);
