import mongoose from 'mongoose';

const projectDocumentSchema = new mongoose.Schema({
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    fileName: { type: String, required: true },
    documentCategory: { type: String }, // e.g. 'ai-dataset'
    datasetType: { type: String },      // e.g. 'hse'
    fileType: { type: String, required: true }, // e.g., 'pdf', 'csv', 'docx'
    fileSize: { type: Number, required: true }, // in bytes
    blobUrl: { type: String, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now },
    version: { type: Number, default: 1 }
}, {
    timestamps: true // adds createdAt and updatedAt
});

projectDocumentSchema.index({ projectId: 1, uploadedAt: -1 });

export default mongoose.model('ProjectDocument', projectDocumentSchema);
