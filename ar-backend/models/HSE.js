import mongoose from 'mongoose';

const hseSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  severity: {
    type: String,
    enum: ['Critical', 'Warning', 'Info'],
    required: true,
  },
  date: { type: Date, required: true },
  description: { type: String, default: '' },
  source: {
    type: String,
    enum: ['manual', 'csv-import'],
    default: 'manual'
  },
  importedFromDocumentId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProjectDocument' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

hseSchema.index({ projectId: 1, date: -1 });

export default mongoose.model('HSE', hseSchema);
