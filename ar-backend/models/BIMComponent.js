import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

const BIMComponentSchema = new mongoose.Schema({
  projectId:              { type: ObjectId, ref: 'Project', required: true },
  element_guid:           { type: String },
  model_id:               { type: String },
  element_name:           { type: String, required: true },
  category:               { type: String },
  subcategory:            { type: String },
  discipline:             { type: String },
  phase:                  { type: String },
  level_zone:             { type: String },
  volume_m3:              { type: Number },
  area_m2:                { type: Number },
  length_m:               { type: Number },
  material:               { type: String },
  weight_kg:              { type: Number },
  planned_start:          { type: Date },
  planned_finish:         { type: Date },
  actual_start:           { type: Date },
  actual_finish:          { type: Date },
  status:                 { type: String },
  responsible_contractor: { type: String },
  work_package_id:        { type: String },
  mep_density_score:      { type: Number },
}, { timestamps: true });

// Primary identity: projectId + element_name (NAME-BASED, not GUID-based)
BIMComponentSchema.index(
  { projectId: 1, element_name: 1 },
  { unique: true }
);

export default mongoose.model('BIMComponent', BIMComponentSchema);
