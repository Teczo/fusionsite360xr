import mongoose from 'mongoose';

const dataPointSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  value: { type: Number, required: true },
}, { _id: false });

const sCurveSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, unique: true },
  baseline: { type: [dataPointSchema], default: [] },
  actual: { type: [dataPointSchema], default: [] },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.model('SCurve', sCurveSchema);
