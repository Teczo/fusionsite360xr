import mongoose from 'mongoose';

const mediaSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  url: { type: String, required: true },
  thumbnail: { type: String },
  name: { type: String, default: '' },
  type: {
    type: String,
    enum: ['image', 'video'],
    default: 'image',
  },
  size: { type: Number },
  mimeType: { type: String },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

mediaSchema.index({ projectId: 1, createdAt: -1 });

export default mongoose.model('Media', mediaSchema);
