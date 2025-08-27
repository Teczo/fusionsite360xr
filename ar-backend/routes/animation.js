// routes/animation.js
import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import Animation from '../models/Animation.js';
import Project from '../models/Project.js';

const router = express.Router();

// Ownership guard
async function ensureProjectOwner(projectId, userId) {
    const project = await Project.findById(projectId);
    if (!project) return { status: 404, error: 'Project not found' };
    if (String(project.userId) !== String(userId)) {
        return { status: 403, error: 'Forbidden' };
    }
    return { project };
}

// Create / Upsert
router.post('/animations', authMiddleware, async (req, res) => {
    try {
        const { projectId, objectId, enabled = true, behaviors = [], version = 1 } = req.body || {};
        if (!projectId || !objectId) return res.status(400).json({ error: 'projectId and objectId are required' });

        const guard = await ensureProjectOwner(projectId, req.userId);
        if (guard.error) return res.status(guard.status).json({ error: guard.error });

        // NEW: if behaviors is empty, treat it as "clear animations" -> delete doc
        if (Array.isArray(behaviors) && behaviors.length === 0) {
            await Animation.findOneAndDelete({ projectId, objectId });
            return res.status(200).json({ ok: true, deleted: true });
        }

        const doc = await Animation.findOneAndUpdate(
            { projectId, objectId },
            { $set: { enabled: !!enabled, behaviors, version: Number(version) } },
            { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
        );
        return res.status(200).json(doc);
    } catch (err) {
        console.error('POST /animations error:', err);
        if (err.code === 11000) return res.status(409).json({ error: 'Animation already exists for this object' });
        return res.status(500).json({ error: 'Server error' });
    }
});

// Read by id
router.get('/animations/:id', authMiddleware, async (req, res) => {
    try {
        const doc = await Animation.findById(req.params.id);
        if (!doc) return res.status(404).json({ error: 'Not found' });

        const guard = await ensureProjectOwner(doc.projectId, req.userId);
        if (guard.error) return res.status(guard.status).json({ error: guard.error });

        return res.json(doc);
    } catch (err) {
        console.error('GET /animations/:id error:', err);
        return res.status(500).json({ error: 'Server error' });
    }
});

// List by project
router.get('/animations', authMiddleware, async (req, res) => {
    try {
        const { projectId } = req.query;
        if (!projectId) return res.status(400).json({ error: 'projectId is required' });

        const guard = await ensureProjectOwner(projectId, req.userId);
        if (guard.error) return res.status(guard.status).json({ error: guard.error });

        const list = await Animation.find({ projectId }).sort({ updatedAt: -1 });
        return res.json(list);
    } catch (err) {
        console.error('GET /animations error:', err);
        return res.status(500).json({ error: 'Server error' });
    }
});

// Get by objectId within a project
router.get('/animations/by-object/:projectId/:objectId', authMiddleware, async (req, res) => {
    try {
        const { projectId, objectId } = req.params;

        const guard = await ensureProjectOwner(projectId, req.userId);
        if (guard.error) return res.status(guard.status).json({ error: guard.error });

        const doc = await Animation.findOne({ projectId, objectId });
        if (!doc) return res.status(404).json({ error: 'Not found' });
        return res.json(doc);
    } catch (err) {
        console.error('GET /animations/by-object error:', err);
        return res.status(500).json({ error: 'Server error' });
    }
});

// Patch (partial update) by id
router.patch('/animations/:id', authMiddleware, async (req, res) => {
    try {
        const doc = await Animation.findById(req.params.id);
        if (!doc) return res.status(404).json({ error: 'Not found' });

        const guard = await ensureProjectOwner(doc.projectId, req.userId);
        if (guard.error) return res.status(guard.status).json({ error: guard.error });

        const { enabled, behaviors, version } = req.body || {};

        // NEW: if client explicitly sends [], interpret as "clear" and delete doc
        if (Array.isArray(behaviors) && behaviors.length === 0) {
            await doc.deleteOne();
            return res.status(200).json({ ok: true, deleted: true });
        }

        if (enabled !== undefined) doc.enabled = !!enabled;
        if (Array.isArray(behaviors)) doc.behaviors = behaviors;
        if (version !== undefined) doc.version = Number(version);

        await doc.validate();
        await doc.save();
        return res.json(doc);
    } catch (err) {
        console.error('PATCH /animations/:id error:', err);
        return res.status(500).json({ error: 'Server error' });
    }
});

// Delete
router.delete('/animations/:id', authMiddleware, async (req, res) => {
    try {
        const doc = await Animation.findById(req.params.id);
        if (!doc) return res.status(404).json({ error: 'Not found' });

        const guard = await ensureProjectOwner(doc.projectId, req.userId);
        if (guard.error) return res.status(guard.status).json({ error: guard.error });

        await doc.deleteOne();
        return res.sendStatus(204);
    } catch (err) {
        console.error('DELETE /animations/:id error:', err);
        return res.status(500).json({ error: 'Server error' });
    }
});

// Export-friendly payload for publishing
router.get('/animations/export/:projectId', authMiddleware, async (req, res) => {
    try {
        const { projectId } = req.params;

        const guard = await ensureProjectOwner(projectId, req.userId);
        if (guard.error) return res.status(guard.status).json({ error: guard.error });

        const list = await Animation.find({ projectId, enabled: true }).lean();
        // Minimal payload to embed with published scene if you want
        const payload = list.map(({ objectId, behaviors, version, updatedAt }) => ({
            objectId,
            version,
            updatedAt,
            behaviors,
        }));
        return res.json(payload);
    } catch (err) {
        console.error('GET /animations/export error:', err);
        return res.status(500).json({ error: 'Server error' });
    }
});

export default router;
