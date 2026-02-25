import mongoose from 'mongoose';

const STATUS_VALUES = ['Not Started', 'In Progress', 'Completed', 'Delayed', 'On Hold'];

const IssueSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  zoneId: { type: String, default: '' },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  severity: {
    type: String,
    enum: ['Critical', 'Warning', 'Info'],
    required: true,
  },
  status: { type: String, enum: STATUS_VALUES, default: 'Not Started' },
  resolvedAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
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

export default mongoose.model('Issue', IssueSchema);
