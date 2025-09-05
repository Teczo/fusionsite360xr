import express from 'express';
import Folder from '../models/Folder.js';
import File from '../models/File.js';

const router = express.Router();

// GET /api/folders - list folders optionally filtered by parent
router.get('/folders', async (req, res) => {
    const { parent } = req.query;
    const query = parent ? { parent } : { parent: null };
    try {
        const folders = await Folder.find(query).sort({ createdAt: -1 });
        res.json(folders);
    } catch (err) {
        console.error('❌ Failed to list folders:', err);
        res.status(500).json({ error: 'Failed to list folders' });
    }
});

// POST /api/folders - create a folder
router.post('/folders', async (req, res) => {
    const { name, parent = null } = req.body;
    try {
        const folder = await Folder.create({ name, parent: parent || null });
        res.status(201).json(folder);
    } catch (err) {
        console.error('❌ Failed to create folder:', err);
        res.status(500).json({ error: 'Failed to create folder' });
    }
});

// PATCH /api/folders/:id - rename or change parent
router.patch('/folders/:id', async (req, res) => {
    const { name, parent } = req.body;
    try {
        const update = {};
        if (name !== undefined) update.name = name;
        if (parent !== undefined) update.parent = parent;
        const folder = await Folder.findByIdAndUpdate(req.params.id, update, { new: true });
        if (!folder) return res.status(404).json({ error: 'Folder not found' });
        res.json(folder);
    } catch (err) {
        console.error('❌ Failed to update folder:', err);
        res.status(500).json({ error: 'Failed to update folder' });
    }
});

// DELETE /api/folders/:id - delete folder and move contents to parent
router.delete('/folders/:id', async (req, res) => {
    try {
        const folder = await Folder.findById(req.params.id);
        if (!folder) return res.status(404).json({ error: 'Folder not found' });

        await File.updateMany({ folder: folder._id }, { folder: folder.parent || null });
        await Folder.updateMany({ parent: folder._id }, { parent: folder.parent || null });

        await Folder.findByIdAndDelete(folder._id);
        res.json({ message: 'Folder deleted' });
    } catch (err) {
        console.error('❌ Failed to delete folder:', err);
        res.status(500).json({ error: 'Failed to delete folder' });
    }
});

export default router;