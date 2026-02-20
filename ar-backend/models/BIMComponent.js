import mongoose from 'mongoose';

const STATUS_VALUES = ['Not Started', 'In Progress', 'Completed', 'Delayed', 'On Hold'];

const BIMComponentSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  zoneId: { type: String, required: true },
  componentId: { type: String },
  name: { type: String },
  type: { type: String },
  status: { type: String, enum: STATUS_VALUES, default: 'Not Started' },
  properties: { type: mongoose.Schema.Types.Mixed },
}, { strict: true, timestamps: true });

export default mongoose.model('BIMComponent', BIMComponentSchema);
