import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import csv from 'csv-parser';
import { Readable } from 'stream';
import Cost from '../models/Cost.js';
import auth from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbac.js';
import { registerUploadedDocument } from '../utils/registerUploadedDocument.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /projects/:projectId/cost/upload
router.post(
    '/projects/:projectId/cost/upload',
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

                // Normalize keys to support various formats without breaking
                const norm = {};
                for (const [k, v] of Object.entries(row)) {
                    norm[k.trim().toLowerCase()] = v?.trim();
                }

                const costId = norm.cost_id || norm.costid || '';
                const workPackageId = norm.work_package_id || norm.workpackageid || '';
                const phase = workPackageId || norm.phase || '';
                const activityId = norm.activity_id || norm.activityid || '';
                const costCategory = norm.cost_category || norm.costcategory || '';
                const description = `${costCategory ? costCategory + ' - ' : ''}${workPackageId || ''}`.trim() || 'Imported Cost';

                const estimatedCost = parseFloat(norm.estimated_cost_usd) || 0;
                const plannedCost = parseFloat(norm.estimated_cost_usd || norm.plannedcost) || 0;
                const committedCost = parseFloat(norm.committed_cost_usd) || 0;
                const actualCost = parseFloat(norm.actual_cost_usd || norm.actualcost) || 0;
                const changeOrderValue = parseFloat(norm.change_order_value_usd) || 0;
                let costPerformanceIndex = parseFloat(norm.cost_performance_index);
                if (isNaN(costPerformanceIndex)) costPerformanceIndex = null;

                const contractor = norm.contractor || '';
                const status = actualCost > 0 ? 'In Progress' : 'Not Started';

                records.push({
                    projectId,
                    costId,
                    workPackageId,
                    phase,
                    activityId,
                    costCategory,
                    description,
                    estimatedCost,
                    plannedCost,
                    committedCost,
                    actualCost,
                    changeOrderValue,
                    costPerformanceIndex,
                    contractor,
                    status,
                    createdBy: req.userId
                });
            }

            await Cost.deleteMany({ projectId });
            await Cost.insertMany(records);

            const doc = await registerUploadedDocument({
                projectId,
                buffer: req.file.buffer,
                originalName: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size,
                category: 'cost',
                userId: req.userId
            });

            res.json({
                success: true,
                importedCount: records.length,
                totalRows: rows.length,
                documentId: doc ? doc._id : null
            });

        } catch (err) {
            console.error('Cost upload failed:', err);
            res.status(500).json({ error: 'Cost upload failed: ' + err.message });
        }
    }
);

// GET /projects/:projectId/cost
router.get('/projects/:projectId/cost', auth, async (req, res) => {
    try {
        const { projectId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json({ error: 'Invalid project id' });
        }

        const costs = await Cost.find({ projectId }).sort({ workPackageId: 1 });
        res.json(costs);
    } catch (err) {
        console.error('Failed to fetch costs:', err);
        res.status(500).json({ error: 'Failed to fetch costs' });
    }
});

// DELETE /projects/:projectId/cost
router.delete('/projects/:projectId/cost', auth, requireRole('admin'), async (req, res) => {
    try {
        const { projectId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json({ error: 'Invalid project id' });
        }
        const result = await Cost.deleteMany({ projectId });
        res.json({ success: true, deleted: result.deletedCount });
    } catch (err) {
        console.error('Clear cost failed:', err);
        res.status(500).json({ error: 'Failed to clear data' });
    }
});

export default router;
