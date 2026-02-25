import mongoose from 'mongoose';

const STATUS_VALUES = ['Open', 'In Progress', 'Closed'];

const HistoryEntrySchema = new mongoose.Schema({
  action:    { type: String, required: true },
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  timestamp: { type: Date, default: Date.now },
  meta:      { type: mongoose.Schema.Types.Mixed }, // optional structured payload
}, { _id: false });

const IssueSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  zoneId:    { type: String, default: '' },
  title:     { type: String, required: true },
  description: { type: String, default: '' },
  severity: {
    type: String,
    enum: ['Critical', 'Warning', 'Info'],
    required: true,
  },
  status: { type: String, enum: STATUS_VALUES, default: 'Open' },
  resolvedAt: { type: Date, default: null },
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Phase 3 — Workflow fields
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  dueDate:    { type: Date, default: null },
  history:    { type: [HistoryEntrySchema], default: [] },

  // Spatial position in 3D world space
  position: {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    z: { type: Number, required: true },
  },
  // Issue category type
  type: {
    type: String,
    enum: ['RFI', 'Observation', 'Safety', 'Clash', 'Defect'],
    default: 'Observation',
  },
}, { strict: true, timestamps: true });

IssueSchema.index({ projectId: 1, zoneId: 1 });
IssueSchema.index({ severity: 1 });
IssueSchema.index({ assignedTo: 1 });

export default mongoose.model('Issue', IssueSchema);
