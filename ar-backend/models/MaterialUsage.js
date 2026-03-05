import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

const materialUsageSchema = new mongoose.Schema({
  projectId:        { type: ObjectId, ref: 'Project', required: true },
  materialName:     { type: String, required: true },          // e.g. 'Ready-Mix Concrete C30'
  category:         { type: String, default: '' },             // e.g. 'Concrete', 'Steel', 'MEP', 'Finishes'
  level:            { type: String, default: '' },             // e.g. 'Ground Floor', 'Level 1'
  zone:             { type: String, default: '' },             // e.g. 'Zone A', 'Zone B'
  unit:             { type: String, default: '' },             // e.g. 'm3', 'tonnes', 'pcs', 'lm'
  boqQty:           { type: Number, default: 0 },              // Bill of Quantities required qty
  deliveredQty:     { type: Number, default: 0 },              // Qty delivered to site
  installedQty:     { type: Number, default: 0 },              // Qty installed / consumed
  reorderLevel:     { type: Number, default: 0 },              // Stock level that triggers reorder
  unitCostUsd:      { type: Number, default: 0 },              // Unit cost for stock value calc
  supplier:         { type: String, default: '' },
  poNumber:         { type: String, default: '' },
  expectedDelivery: { type: Date },
  actualDelivery:   { type: Date },
  deliveryStatus:   { type: String, enum: ['ordered','in transit','delivered','delayed','cancelled'], default: 'ordered' },
  linkedMilestone:  { type: String, default: '' },             // Milestone name this material supports
  milestoneDate:    { type: Date },                            // Date of that milestone (for risk flagging)
  componentIds:     [{ type: String }],
}, { timestamps: true });

materialUsageSchema.index({ projectId: 1, category: 1 });
materialUsageSchema.index({ projectId: 1, zone: 1 });

export default mongoose.model('MaterialUsage', materialUsageSchema);
