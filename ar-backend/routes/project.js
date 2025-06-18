// routes/project.js
import express from 'express';
import Project from '../models/Project.js';
import auth from '../middleware/authMiddleware.js';

const router = express.Router();

// Create project
router.post('/projects', auth, async (req, res) => {
    try {
        const { name, description } = req.body;

        const newProject = new Project({
            userId: req.userId,
            name,
            description,
        });

        await newProject.save();
        res.status(201).json(newProject);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create project' });
    }
});

// Get trashed projects (MUST come before /:id route)
router.get('/projects/trashed', auth, async (req, res) => {
    try {
        const projects = await Project.find({ userId: req.userId, trashed: true }).sort({ updatedAt: -1 });
        res.json(projects);
    } catch (err) {
        console.error('❌ Failed to fetch trashed projects:', err);
        res.status(500).json({ error: 'Failed to load trashed projects' });
    }
});

// Get all non-trashed projects
router.get('/projects', auth, async (req, res) => {
    try {
        const projects = await Project.find({ userId: req.userId, trashed: false }).sort({ updatedAt: -1 });
        res.json(projects);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to load projects' });
    }
});

// Get one project
router.get('/projects/:id', auth, async (req, res) => {
    try {
        const project = await Project.findOne({ _id: req.params.id, userId: req.userId });
        if (!project) return res.status(404).json({ error: 'Project not found' });
        res.json(project);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch project' });
    }
});

// Update project scene
router.put('/projects/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { scene } = req.body;

        const project = await Project.findOne({ _id: id, userId: req.userId });
        if (!project) return res.status(404).json({ error: 'Project not found' });

        project.scene = scene;
        await project.save();

        res.json({ message: 'Scene saved', project });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update project' });
    }
});

// Publish a project
router.put('/projects/:id/publish', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { scene } = req.body;

        const project = await Project.findOne({ _id: id, userId: req.userId });
        if (!project) return res.status(404).json({ error: 'Project not found' });

        project.published = true;
        project.publishedAt = new Date();
        project.publishedScene = scene;
        await project.save();

        res.json({ message: 'Published', shareUrl: `/ar/${project._id}` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to publish project' });
    }
});

// Public route: Get published scene
router.get('/published/:id', async (req, res) => {
    try {
        const project = await Project.findOne({ _id: req.params.id, published: true });
        if (!project) return res.status(404).json({ error: 'Published scene not found' });
        res.json(project);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to load published scene' });
    }
});

// Return first model from published project
router.get('/published-model/:id', async (req, res) => {
    try {
        const project = await Project.findOne({ _id: req.params.id, published: true });

        if (!project || !project.publishedScene) {
            return res.status(404).json({ error: 'Published scene not found' });
        }

        const model = project.publishedScene.find((item) => item.type === 'model');

        if (!model) {
            return res.status(404).json({ error: 'No model found in scene' });
        }

        res.json({ url: model.url });
    } catch (err) {
        console.error('Failed to load published model', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Soft delete (move to trash)
router.delete('/projects/:id', auth, async (req, res) => {
    try {
        const project = await Project.findOne({ _id: req.params.id, userId: req.userId });
        if (!project) return res.status(404).json({ error: 'Project not found' });

        project.trashed = true;
        await project.save();

        res.json({ message: 'Project moved to trash' });
    } catch (err) {
        console.error('❌ Failed to move to trash:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Restore from trash
router.patch('/projects/:id/restore', auth, async (req, res) => {
    try {
        const project = await Project.findOne({ _id: req.params.id, userId: req.userId });
        if (!project) return res.status(404).json({ error: 'Project not found' });

        project.trashed = false;
        await project.save();

        res.json({ message: 'Project restored successfully' });
    } catch (err) {
        console.error('❌ Failed to restore project:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Permanent delete
router.delete('/projects/:id/permanent', auth, async (req, res) => {
    try {
        const { id } = req.params;

        const deleted = await Project.findOneAndDelete({ _id: id, userId: req.userId });
        if (!deleted) return res.status(404).json({ error: 'Project not found or not yours' });

        res.status(200).json({ message: 'Project permanently deleted' });
    } catch (err) {
        console.error('❌ Failed to permanently delete project:', err);
        res.status(500).json({ error: 'Server error during delete' });
    }
});

export default router;
