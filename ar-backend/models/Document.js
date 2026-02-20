import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  // Foreign key to the parent project
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },

  // Optional link to a schedule activity (e.g. an inspection report linked to a specific task)
  linkedActivityId: { type: mongoose.Schema.Types.ObjectId, ref: 'ScheduleActivity' },

  // High-level grouping for Q9 document retrieval (e.g. 'Inspection Report', 'Drawing', 'Permit')
  category: { type: String, required: true, index: true },

  // Original filename of the uploaded document
  fileName: { type: String, required: true },

  // Publicly accessible or pre-signed URL pointing to the stored document blob
  fileUrl: { type: String, required: true },

  // Finer-grained classification within a category (e.g. 'ITP', 'Method Statement', 'RFI')
  documentType: { type: String, index: true },

  // The user who uploaded this document
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { strict: true, timestamps: true });

// Supports Q9: retrieve all documents of a specific category within a project
documentSchema.index({ projectId: 1, category: 1 });

// Supports fetching all documents linked to a specific schedule activity
documentSchema.index({ linkedActivityId: 1 });

export default mongoose.model('Document', documentSchema);
