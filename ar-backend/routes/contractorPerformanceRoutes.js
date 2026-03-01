import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import csv from 'csv-parser';
import { Readable } from 'stream';
import ContractorPerformance from '../models/ContractorPerformance.js';
import auth from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbac.js';
import { registerUploadedDocument } from '../utils/registerUploadedDocument.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /projects/:projectId/contractor-performance/upload
router.post(
    '/projects/:projectId/contractor-performance/upload',
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

                const contractorName = norm.contractor_name || norm.contractorname || '';
                if (!contractorName) continue;

                const totalActivities = parseInt(norm.total_activities) || 0;
                const delayedActivities = parseInt(norm.delayed_activities) || 0;
                const totalDelayDays = parseInt(norm.total_delay_days) || 0;
                const incidents = parseInt(norm.incidents) || 0;
                const reworkCount = parseInt(norm.rework_count) || 0;

                let avgDelayDays = 0;
                let incidentRate = 0;
                let reworkFrequency = 0;

                if (totalActivities > 0) {
                    avgDelayDays = delayedActivities > 0 ? totalDelayDays / delayedActivities : 0;
                    incidentRate = incidents / totalActivities;
                    reworkFrequency = reworkCount / totalActivities;
                }

                records.push({
                    projectId,
                    contractorName,
                    totalActivities,
                    delayedActivities,
                    totalDelayDays,
                    incidents,
                    reworkCount,
                    avgDelayDays,
                    incidentRate,
                    reworkFrequency
                });
            }

            await ContractorPerformance.deleteMany({ projectId });
            await ContractorPerformance.insertMany(records);

            const doc = await registerUploadedDocument({
                projectId,
                buffer: req.file.buffer,
                originalName: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size,
                category: 'contractor-performance',
                userId: req.userId
            });

            res.json({
                success: true,
                importedCount: records.length,
                totalRows: rows.length,
                documentId: doc ? doc._id : null
            });

        } catch (err) {
            console.error('Contractor Performance upload failed:', err);
            res.status(500).json({ error: 'Contractor Performance upload failed: ' + err.message });
        }
    }
);

// GET /projects/:projectId/contractor-performance
router.get('/projects/:projectId/contractor-performance', auth, async (req, res) => {
    try {
        const { projectId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json({ error: 'Invalid project id' });
        }

        const records = await ContractorPerformance.find({ projectId }).sort({ contractorName: 1 });
        res.json(records);
    } catch (err) {
        console.error('Failed to fetch contractor performance:', err);
        res.status(500).json({ error: 'Failed to fetch contractor performance' });
    }
});

// DELETE /projects/:projectId/contractor-performance
router.delete('/projects/:projectId/contractor-performance', auth, requireRole('admin'), async (req, res) => {
    try {
        const { projectId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json({ error: 'Invalid project id' });
        }
        const result = await ContractorPerformance.deleteMany({ projectId });
        res.json({ success: true, deleted: result.deletedCount });
    } catch (err) {
        console.error('Clear contractor performance failed:', err);
        res.status(500).json({ error: 'Failed to clear data' });
    }
});

export default router;
