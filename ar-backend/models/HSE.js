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
  // incidentDate is a distinct queryable date field for incident-specific reporting.
  // Existing documents that pre-date this field will have null here.
  incidentDate: { type: Date, default: null },
  // MIGRATION: default '' preserves compatibility with legacy documents that pre-date this field being required.
  zoneId: { type: String, required: true, default: '' },
  source: {
    type: String,
    enum: ['manual', 'csv-import'],
    default: 'manual'
  },
  importedFromDocumentId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProjectDocument' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  computedSeverityWeight: { type: Number, default: 0 },
}, { strict: true, timestamps: true });

hseSchema.index({ projectId: 1, date: -1 });          // pre-existing
hseSchema.index({ projectId: 1, incidentDate: 1 });
hseSchema.index({ projectId: 1, zoneId: 1 });
hseSchema.index({ severity: 1 });

export default mongoose.model('HSE', hseSchema);
