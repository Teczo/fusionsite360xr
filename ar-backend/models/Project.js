import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    description: { type: String },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    status: {
        type: String,
        enum: ['Planning', 'Active', 'On Hold', 'Completed'],
        default: 'Planning',
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
}, { timestamps: true });


export default mongoose.model('Project', projectSchema);
