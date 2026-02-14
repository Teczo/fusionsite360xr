import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  title: { type: String, required: true },
  severity: {
    type: String,
    enum: ['Critical', 'Warning', 'Info'],
    required: true,
  },
  source: {
    type: String,
    enum: ['manual', 'iot'],
    default: 'manual',
  },
  date: { type: Date, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

alertSchema.index({ projectId: 1, date: -1 });

export default mongoose.model('Alert', alertSchema);
