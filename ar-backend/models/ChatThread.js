import mongoose from 'mongoose';

const chatThreadSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  title:     { type: String, default: 'New Chat' },
  lastMessageAt: { type: Date, default: Date.now, index: true },
}, { timestamps: true });

// Compound index for listing user's threads for a project, sorted by most recent
chatThreadSchema.index({ userId: 1, projectId: 1, lastMessageAt: -1 });

export default mongoose.model('ChatThread', chatThreadSchema);
