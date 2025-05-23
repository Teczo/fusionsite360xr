const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    description: { type: String },
    scene: { type: Object, default: {} }, // later: store models, transforms
    published: { type: Boolean, default: false },
    publishedAt: { type: Date },
    publishedScene: { type: Object }, // final copy of the scene
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);
