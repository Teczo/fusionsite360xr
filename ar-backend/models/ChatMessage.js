import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema({
  threadId:  { type: mongoose.Schema.Types.ObjectId, ref: 'ChatThread', required: true, index: true },
  role:      { type: String, enum: ['user', 'assistant'], required: true },
  content:   { type: String, required: true },           // The text shown in chat
  data:      { type: mongoose.Schema.Types.Mixed },       // Structured tool result (for AI messages)
  intent:    { type: String },                            // Tool/intent used (for AI messages)
  provider:  { type: String },                            // AI provider used
  auditLogId: { type: mongoose.Schema.Types.ObjectId },   // Link to AIAuditLog
  suggestedFollowUps: [{ type: String }],                 // LLM-generated follow-up questions
}, { timestamps: true });

// Index for loading thread messages in order
chatMessageSchema.index({ threadId: 1, createdAt: 1 });

export default mongoose.model('ChatMessage', chatMessageSchema);
