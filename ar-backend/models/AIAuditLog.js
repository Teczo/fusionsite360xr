import mongoose from 'mongoose';

const aiAuditLogSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
  question:  { type: String },
  intent:    { type: String },
  provider:  { type: String },
  model:     { type: String, default: null },
  toolsCalled:    { type: [String], default: [] },
  isMultiStep:    { type: Boolean, default: false },
  stepsUsed:      { type: Number, default: 1 },
  responseTimeMs: { type: Number },
  success:        { type: Boolean },
  error:          { type: String, default: null },
  userFeedback:   { type: String, enum: ['helpful', 'unhelpful', null], default: null },
  feedbackComment: { type: String, default: null },
}, { timestamps: true });

aiAuditLogSchema.index({ userId: 1, createdAt: -1 });
aiAuditLogSchema.index({ projectId: 1, createdAt: -1 });
aiAuditLogSchema.index({ provider: 1, createdAt: -1 });
aiAuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

export default mongoose.model('AIAuditLog', aiAuditLogSchema);
