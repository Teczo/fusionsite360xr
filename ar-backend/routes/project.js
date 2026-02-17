import express from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import path from 'path';
import cors from 'cors';
import { BlobServiceClient } from '@azure/storage-blob';

import Project from '../models/Project.js';
import auth from '../middleware/authMiddleware.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/* ---------------------------------------------------
   CORS (specific endpoints)
--------------------------------------------------- */

router.options('/projects/:id/thumbnail', cors({
    origin: ['https://holoxr.teczo.co', 'https://holoxr.onrender.com', 'http://localhost:5173'],
    methods: ['PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));

/* ---------------------------------------------------
   CREATE PROJECT
--------------------------------------------------- */

router.post('/projects', auth, async (req, res) => {
    try {
        const {
            name, description, startDate, endDate,
            status, tags, projectCode, teamMembers, location,
        } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Project name is required' });
        }

        // Validate date range only if both are provided
        if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
            return res.status(400).json({ error: 'Start date must be before end date' });
        }

        // Build clean data — omit empty optional fields
        const data = { userId: req.userId, name };

        if (description)  data.description = description;
        if (startDate)     data.startDate = startDate;
        if (endDate)       data.endDate = endDate;
        if (status)        data.status = status;
        if (projectCode)   data.projectCode = projectCode;

        if (Array.isArray(tags) && tags.length > 0) {
            data.tags = tags;
        }
        if (Array.isArray(teamMembers) && teamMembers.length > 0) {
            data.teamMembers = teamMembers;
        }
        if (location && (location.address || location.latitude != null || location.longitude != null)) {
            data.location = {};
            if (location.address)          data.location.address = location.address;
            if (location.latitude != null)  data.location.latitude = location.latitude;
            if (location.longitude != null) data.location.longitude = location.longitude;
        }

        const project = new Project(data);
        await project.save();
        res.status(201).json(project);
    } catch (err) {
        console.error('❌ Create project failed:', err);
        res.status(500).json({ error: 'Failed to create project' });
    }
});

/* ---------------------------------------------------
   TRASHED PROJECTS (STATIC ROUTES FIRST)
--------------------------------------------------- */

router.get('/projects/trashed', auth, async (req, res) => {
    try {
        const projects = await Project
            .find({ userId: req.userId, trashed: true })
            .sort({ updatedAt: -1 });

        res.json(projects);
    } catch (err) {
        console.error('❌ Failed to fetch trashed projects:', err);
        res.status(500).json({ error: 'Failed to load trashed projects' });
    }
});

/* ---------------------------------------------------
   SHARED PROJECTS (MUST COME BEFORE :id)
--------------------------------------------------- */

router.get('/projects/shared', auth, async (req, res) => {
    try {
        const uid = req.userId;
        if (!uid) return res.status(401).json({ error: 'Unauthorized' });

        const docs = await Project.find({ 'access.user': uid })
            .select('_id name thumbnail updatedAt owner access')
            .populate('owner', 'name')
            .lean();

        const list = (docs || []).map(d => ({
            _id: String(d._id),
            name: d.name,
            thumbnail: d.thumbnail || null,
            updatedAt: d.updatedAt,
            owner: d.owner
                ? { id: String(d.owner._id), name: d.owner.name }
                : null,
            myPermission:
                (d.access || []).find(a => String(a.user) === String(uid))?.permission || 'view'
        }));

        res.json(list);
    } catch (err) {
        console.error('❌ Failed to load shared projects:', err);
        res.json([]); // Never crash UI
    }
});

/* ---------------------------------------------------
   ALL NON-TRASHED PROJECTS
--------------------------------------------------- */

router.get('/projects', auth, async (req, res) => {
    try {
        const projects = await Project
            .find({ userId: req.userId, trashed: false })
            .sort({ updatedAt: -1 });

        res.json(projects);
    } catch (err) {
        console.error('❌ Failed to load projects:', err);
        res.status(500).json({ error: 'Failed to load projects' });
    }
});

/* ---------------------------------------------------
   GET ONE PROJECT (SAFE)
--------------------------------------------------- */

router.get('/projects/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid project id' });
        }

        const project = await Project.findOne({
            _id: id,
            userId: req.userId
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        res.json(project);
    } catch (err) {
        console.error('❌ Failed to fetch project:', err);
        res.status(500).json({ error: 'Failed to fetch project' });
    }
});

/* ---------------------------------------------------
   UPDATE PROJECT SCENE
--------------------------------------------------- */

router.put('/projects/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { scene } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid project id' });
        }

        const project = await Project.findOne({ _id: id, userId: req.userId });
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        project.scene = scene;
        await project.save();

        res.json({ message: 'Scene saved', project });
    } catch (err) {
        console.error('❌ Failed to update scene:', err);
        res.status(500).json({ error: 'Failed to update project' });
    }
});

/* ---------------------------------------------------
   PUBLISH PROJECT
--------------------------------------------------- */

router.put('/projects/:id/publish', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { scene } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid project id' });
        }

        const project = await Project.findOne({ _id: id, userId: req.userId });
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        project.published = true;
        project.publishedAt = new Date();
        project.publishedScene = scene;

        await project.save();

        res.json({
            message: 'Published',
            shareUrl: `/ar/${project._id}`
        });
    } catch (err) {
        console.error('❌ Failed to publish project:', err);
        res.status(500).json({ error: 'Failed to publish project' });
    }
});

/* ---------------------------------------------------
   PUBLIC: GET PUBLISHED SCENE (DIGITAL TWIN / AR)
--------------------------------------------------- */

router.get('/published/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid project id' });
        }

        const project = await Project.findOne({
            _id: id,
            published: true
        });

        if (!project) {
            return res.status(404).json({ error: 'Published scene not found' });
        }

        res.json(project);
    } catch (err) {
        console.error('❌ Failed to load published scene:', err);
        res.status(500).json({ error: 'Failed to load published scene' });
    }
});

/* ---------------------------------------------------
   PUBLIC: GET FIRST MODEL ONLY
--------------------------------------------------- */

router.get('/published-model/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid project id' });
        }

        const project = await Project.findOne({
            _id: id,
            published: true
        });

        if (!project || !Array.isArray(project.publishedScene)) {
            return res.status(404).json({ error: 'Published scene not found' });
        }

        const model = project.publishedScene.find(i => i.type === 'model');
        if (!model) {
            return res.status(404).json({ error: 'No model found in scene' });
        }

        res.json(model);
    } catch (err) {
        console.error('❌ Failed to load published model:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

/* ---------------------------------------------------
   SOFT DELETE
--------------------------------------------------- */

router.delete('/projects/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid project id' });
        }

        const project = await Project.findOne({ _id: id, userId: req.userId });
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        project.trashed = true;
        await project.save();

        res.json({ message: 'Project moved to trash' });
    } catch (err) {
        console.error('❌ Failed to move to trash:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

/* ---------------------------------------------------
   RESTORE FROM TRASH
--------------------------------------------------- */

router.patch('/projects/:id/restore', auth, async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid project id' });
        }

        const project = await Project.findOne({ _id: id, userId: req.userId });
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        project.trashed = false;
        await project.save();

        res.json({ message: 'Project restored successfully' });
    } catch (err) {
        console.error('❌ Failed to restore project:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

/* ---------------------------------------------------
   PERMANENT DELETE
--------------------------------------------------- */

router.delete('/projects/:id/permanent', auth, async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid project id' });
        }

        const deleted = await Project.findOneAndDelete({
            _id: id,
            userId: req.userId
        });

        if (!deleted) {
            return res.status(404).json({ error: 'Project not found or not yours' });
        }

        res.json({ message: 'Project permanently deleted' });
    } catch (err) {
        console.error('❌ Failed to permanently delete project:', err);
        res.status(500).json({ error: 'Server error during delete' });
    }
});

/* ---------------------------------------------------
   UPDATE THUMBNAIL
--------------------------------------------------- */

router.patch(
    '/projects/:id/thumbnail',
    cors({
        origin: ['https://holoxr.teczo.co', 'https://holoxr.onrender.com', 'http://localhost:5173'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    }),
    auth,
    upload.single('thumbnail'),
    async (req, res) => {
        try {
            const { id } = req.params;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({ error: 'Invalid project id' });
            }

            const project = await Project.findOne({ _id: id, userId: req.userId });
            if (!project) {
                return res.status(404).json({ error: 'Project not found' });
            }

            if (!req.file) {
                return res.status(400).json({ error: 'No thumbnail provided' });
            }

            const conn = process.env.AZURE_STORAGE_CONNECTION_STRING;
            if (!conn) {
                return res.status(500).json({ error: 'Azure configuration missing' });
            }

            const blobServiceClient = BlobServiceClient.fromConnectionString(conn);
            const containerClient = blobServiceClient.getContainerClient('uploads');

            const blobName = `thumbnails/projects/${project._id}-${Date.now()}.webp`;
            const blockBlob = containerClient.getBlockBlobClient(blobName);

            await blockBlob.uploadData(req.file.buffer, {
                blobHTTPHeaders: {
                    blobContentType: req.file.mimetype || 'image/webp'
                }
            });

            project.thumbnail = blockBlob.url;
            await project.save();

            res.json({ message: 'Thumbnail updated', project });
        } catch (err) {
            console.error('❌ Failed to update thumbnail:', err);
            res.status(500).json({ error: 'Failed to update project thumbnail' });
        }
    }
);

export default router;
