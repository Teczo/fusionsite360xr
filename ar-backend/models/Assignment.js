import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

const assignmentSchema = new mongoose.Schema({
  projectId:         { type: ObjectId, ref: 'Project', required: true },
  discipline:        { type: String, required: true },  // e.g. 'HVAC', 'Electrical', 'Structural', 'Piping', 'Fire Protection'
  contractor:        { type: String },
  responsiblePerson: { type: String },
  zone:              { type: String },
  componentIds:      [{ type: String }],
  status:            { type: String, enum: ['active', 'completed', 'on-hold'], default: 'active' },
}, { timestamps: true });

assignmentSchema.index({ projectId: 1, discipline: 1 });

export default mongoose.model('Assignment', assignmentSchema);
