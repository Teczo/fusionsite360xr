import mongoose from 'mongoose';

const issueSchema = new mongoose.Schema({
  // Foreign key to the parent project
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },

  // BIM element GUID — links this issue to a specific BIM component for density risk analysis (Q16)
  bimGuid: { type: String, required: true, index: true },

  // Zone identifier within the project site — used for cross-zone analytics
  zoneId: { type: String, required: true, index: true },

  // Optional link to a schedule activity; when present, referential integrity is validated in pre-save
  activityId: { type: mongoose.Schema.Types.ObjectId, ref: 'ScheduleActivity', index: true },

  // Category of the issue (e.g. 'Safety', 'Quality', 'Design') — used for Q17 safety risk filtering
  issueType: { type: String, required: true, index: true },

  // Severity classification following the established pattern in Alert.js and HSE.js
  severity: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    required: true,
  },

  // Workflow state of the issue
  status: {
    type: String,
    enum: ['Open', 'In Progress', 'Resolved', 'Closed'],
    required: true,
  },
}, { strict: true, timestamps: true });

// Supports cross-zone issue analytics and zone-scoped queries
issueSchema.index({ projectId: 1, zoneId: 1 });

// Supports per-project issue type aggregation (Q17 safety risk)
issueSchema.index({ projectId: 1, issueType: 1 });

// Supports severity-based filtering and ranking across all projects
issueSchema.index({ severity: 1 });

// Validate that the referenced ScheduleActivity exists when activityId is provided
issueSchema.pre('save', async function (next) {
  // Skip validation when no activityId is set
  if (!this.activityId) {
    return next();
  }

  try {
    // Use the Mongoose model registry to avoid a circular import
    const ScheduleActivity = mongoose.model('ScheduleActivity');
    const exists = await ScheduleActivity.exists({ _id: this.activityId });
    if (!exists) {
      return next(new Error(`ScheduleActivity with id ${this.activityId} does not exist`));
    }
    next();
  } catch (err) {
    next(err);
  }
});

export default mongoose.model('Issue', issueSchema);
