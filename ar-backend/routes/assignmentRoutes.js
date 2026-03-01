import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import csv from 'csv-parser';
import { Readable } from 'stream';
import Assignment from '../models/Assignment.js';
import auth from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbac.js';
import { registerUploadedDocument } from '../utils/registerUploadedDocument.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /projects/:projectId/assignments/upload
router.post(
    '/projects/:projectId/assignments/upload',
    auth,
    requireRole('admin'),
    upload.single('file'),
    async (req, res) => {
        try {
            const { projectId } = req.params;

            if (!mongoose.Types.ObjectId.isValid(projectId)) {
                return res.status(400).json({ error: 'Invalid project id' });
            }

            if (!req.file) {
                return res.status(400).json({ error: 'No file provided' });
            }

            const rows = [];
            const stream = Readable.from(req.file.buffer.toString());

            await new Promise((resolve, reject) => {
                stream
                    .pipe(csv())
                    .on('data', (data) => rows.push(data))
                    .on('end', resolve)
                    .on('error', reject);
            });

            if (rows.length === 0) {
                return res.status(400).json({ error: 'CSV file is empty' });
            }

            const records = [];

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];

                const norm = {};
                for (const [k, v] of Object.entries(row)) {
                    norm[k.trim().toLowerCase()] = v?.trim();
                }

                const discipline = norm.discipline || '';
                if (!discipline) continue;

                records.push({
                    projectId,
                    discipline,
                    contractor: norm.contractor || '',
                    responsiblePerson: norm.responsible_person || norm.responsibleperson || '',
                    zone: norm.zone || '',
                    componentIds: norm.component_ids ? norm.component_ids.split(';') : [],
                    status: norm.status || 'active'
                });
            }

            await Assignment.deleteMany({ projectId });
            await Assignment.insertMany(records);

            const doc = await registerUploadedDocument({
                projectId,
                buffer: req.file.buffer,
                originalName: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size,
                category: 'assignment-import',
                userId: req.userId
            });

            res.json({
                success: true,
                importedCount: records.length,
                totalRows: rows.length,
                documentId: doc ? doc._id : null
            });

        } catch (err) {
            console.error('Assignment upload failed:', err);
            res.status(500).json({ error: 'Assignment upload failed: ' + err.message });
        }
    }
);

// GET /projects/:projectId/assignments
router.get('/projects/:projectId/assignments', auth, async (req, res) => {
    try {
        const { projectId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json({ error: 'Invalid project id' });
        }

        const records = await Assignment.find({ projectId }).sort({ discipline: 1 });
        res.json(records);
    } catch (err) {
        console.error('Failed to fetch assignments:', err);
        res.status(500).json({ error: 'Failed to fetch assignments' });
    }
});

// DELETE /projects/:projectId/assignments
router.delete('/projects/:projectId/assignments', auth, requireRole('admin'), async (req, res) => {
    try {
        const { projectId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json({ error: 'Invalid project id' });
        }
        const result = await Assignment.deleteMany({ projectId });
        res.json({ success: true, deleted: result.deletedCount });
    } catch (err) {
        console.error('Clear assignments failed:', err);
        res.status(500).json({ error: 'Failed to clear data' });
    }
});

export default router;
