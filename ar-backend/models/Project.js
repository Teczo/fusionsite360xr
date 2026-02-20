import mongoose from 'mongoose';

// Standard project lifecycle status vocabulary
const STATUS_VALUES = ['Not Started', 'In Progress', 'Completed', 'Delayed', 'On Hold'];

// Migration map: normalises legacy status values written before the v2 schema hardening pass.
// Applied in pre('save') so existing documents are migrated on their next write.
const STATUS_MIGRATION_MAP = {
  'Planning':        'Not Started',
  'Active':          'In Progress',
  'Behind Schedule': 'Delayed',
  'Late':            'Delayed',
  'Done':            'Completed',
  'Ongoing':         'In Progress',
};

const projectSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    description: { type: String },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    status: {
        type: String,
        enum: STATUS_VALUES,
        default: 'Not Started',
    },
    tags: { type: [String], default: [] },
    projectCode: { type: String, default: null },
    teamMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    location: {
        address: { type: String, default: null },
        latitude: { type: Number, default: null },
        longitude: { type: Number, default: null },
    },
    thumbnail: { type: String },
    scene: { type: [mongoose.Schema.Types.Mixed], default: [] },
    published: { type: Boolean, default: false },
    publishedAt: { type: Date },
    publishedScene: { type: [mongoose.Schema.Types.Mixed], default: [] },
    trashed: { type: Boolean, default: false },
}, { strict: true, timestamps: true });

// Normalise legacy status values before validation so existing documents are never rejected.
projectSchema.pre('save', function (next) {
    if (this.status && STATUS_MIGRATION_MAP[this.status]) {
        this.status = STATUS_MIGRATION_MAP[this.status];
    }
    next();
});

export default mongoose.model('Project', projectSchema);
