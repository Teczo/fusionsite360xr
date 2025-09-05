import mongoose from 'mongoose';

const folderSchema = new mongoose.Schema({
    name: { type: String, required: true },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
    createdAt: { type: Date, default: Date.now },
    trashed: { type: Boolean, default: false },
});

export default mongoose.model('Folder', folderSchema);