import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

const assignmentSchema = new mongoose.Schema({
  projectId:         { type: ObjectId, ref: 'Project', required: true },
  discipline:        { type: String, required: true },  // e.g. 'HVAC', 'Electrical', 'Structural', 'Piping', 'Fire Protection'
  contractor:        { type: String },
  responsiblePerson: { type: String },
  zone:              { type: String },
  componentIds:      [{ type: String }],
  floor:             { type: String, default: '' },
  workScope:         { type: String, default: '' },
  shift:             { type: String, enum: ['day', 'night', 'both'], default: 'day' },
  status:            { type: String, enum: ['scheduled', 'mobilizing', 'active', 'delayed', 'suspended', 'completed', 'on-hold', 'pending'], default: 'active' },
  startDate:         { type: Date },
  endDate:           { type: Date },
  headcount:         { type: Number, default: 0 },
}, { timestamps: true });

assignmentSchema.index({ projectId: 1, discipline: 1 });

export default mongoose.model('Assignment', assignmentSchema);
