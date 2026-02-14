import mongoose from 'mongoose';

const timelineSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  date: { type: Date, required: true },
  type: {
    type: String,
    enum: ['milestone', 'incident', 'progress_update'],
    default: 'progress_update',
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

timelineSchema.index({ projectId: 1, date: -1 });

export default mongoose.model('Timeline', timelineSchema);
