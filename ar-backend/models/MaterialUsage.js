import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

const materialUsageSchema = new mongoose.Schema({
  projectId:    { type: ObjectId, ref: 'Project', required: true },
  level:        { type: String },  // e.g. 'Level 3', 'Ground Floor', 'Basement'
  materialType: { type: String, required: true },  // e.g. 'concrete', 'structural steel', 'rebar', 'copper pipe'
  quantity:     { type: Number },
  unit:         { type: String },  // e.g. 'm3', 'tonnes', 'pieces', 'metres'
  componentIds: [{ type: String }],
}, { timestamps: true });

materialUsageSchema.index({ projectId: 1, level: 1 });

export default mongoose.model('MaterialUsage', materialUsageSchema);
