import mongoose from 'mongoose';

const bimComponentSchema = new mongoose.Schema({
  // Foreign key to the parent project
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },

  // Globally unique BIM element identifier (IFC GUID format)
  // Used as the cross-model join key between Issue and BIMComponent for density risk (Q16)
  bimGuid: { type: String, required: true, unique: true, index: true },

  // Zone identifier within the project — used for density risk calculations (Q16)
  zoneId: { type: String, required: true, index: true },

  // Building level/floor where this element is located (e.g. 'L1', 'L2', 'Roof')
  level: { type: String, index: true },

  // Engineering discipline (e.g. 'Structural', 'MEP', 'Architectural', 'Civil')
  discipline: { type: String },

  // Element classification (e.g. 'Wall', 'Beam', 'Duct', 'Panel') — used for Q1 quantity lookup
  elementType: { type: String, required: true, index: true },

  // Material specification — used for Q6 material breakdown aggregation
  material: { type: String },

  // Electrical power rating in kW — relevant for MEP discipline elements
  powerRating: { type: Number },

  // Date when the physical element was installed on site
  installationDate: { type: Date },
}, { strict: true, timestamps: true });

// Supports Q1 quantity lookup by element type within a project
// and Q6 material breakdown (combined with $group on material field)
bimComponentSchema.index({ projectId: 1, elementType: 1 });

// Supports Q16 BIM density risk — aggregating element count per zone
bimComponentSchema.index({ projectId: 1, zoneId: 1 });

// Supports global discipline filtering across all projects
bimComponentSchema.index({ discipline: 1 });

export default mongoose.model('BIMComponent', bimComponentSchema);
