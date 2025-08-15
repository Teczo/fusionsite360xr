import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    description: { type: String },
    thumbnail: { type: String },            // ✅ NEW
    scene: { type: [mongoose.Schema.Types.Mixed], default: [] },
    published: { type: Boolean, default: false },
    publishedAt: { type: Date },
    publishedScene: { type: [mongoose.Schema.Types.Mixed], default: [] },
    trashed: { type: Boolean, default: false },
}, { timestamps: true });


export default mongoose.model('Project', projectSchema);
