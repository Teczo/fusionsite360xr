const express = require('express');
const Project = require('../models/Project');
const auth = require('../middleware/authMiddleware');
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

// Update scene in project
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

// Get all projects for the logged-in user
router.get('/projects', auth, async (req, res) => {
    try {
        const projects = await Project.find({ userId: req.userId }).sort({ updatedAt: -1 });
        res.json(projects);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to load projects' });
    }
});

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

// Publish a project
router.put('/projects/:id/publish', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { scene } = req.body;

        const project = await Project.findOne({ _id: id, userId: req.userId });
        if (!project) return res.status(404).json({ error: 'Project not found' });

        project.published = true;
        project.publishedAt = new Date();
        project.publishedScene = scene; // save current snapshot
        await project.save();

        res.json({ message: 'Published', shareUrl: `/ar/${project._id}` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to publish project' });
    }
});

// Public route: get published scene
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

// Return the first model from a published project
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

module.exports = router;
