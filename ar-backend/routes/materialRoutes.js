import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import csv from 'csv-parser';
import { Readable } from 'stream';
import MaterialUsage from '../models/MaterialUsage.js';
import auth from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbac.js';
import { registerUploadedDocument } from '../utils/registerUploadedDocument.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const DELIVERY_STATUS_MAP = {
  ordered:     'ordered',
  'in transit':'in transit',
  intransit:   'in transit',
  delivered:   'delivered',
  delayed:     'delayed',
  cancelled:   'cancelled',
};

// POST /projects/:projectId/materials/upload
router.post(
    '/projects/:projectId/materials/upload',
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
                    norm[k.trim().toLowerCase().replace(/\s+/g, '_')] = v?.trim();
                }

                // Support both old column name (material_type) and new (material_name)
                const materialName = norm.material_name || norm.material_type || norm.materialname || norm.materialtype || '';
                if (!materialName) continue;

                const rawStatus = (norm.delivery_status || norm.status || 'ordered').toLowerCase().replace(/\s+/g, ' ');
                const deliveryStatus = DELIVERY_STATUS_MAP[rawStatus.replace(/\s/g, '')] || DELIVERY_STATUS_MAP[rawStatus] || 'ordered';

                records.push({
                    projectId,
                    materialName,
                    category:         norm.category || '',
                    level:            norm.level || '',
                    zone:             norm.zone || '',
                    unit:             norm.unit || '',
                    boqQty:           parseFloat(norm.boq_qty || norm.boqqty || norm.required_qty || norm.quantity || 0) || 0,
                    deliveredQty:     parseFloat(norm.delivered_qty || norm.deliveredqty || 0) || 0,
                    installedQty:     parseFloat(norm.installed_qty || norm.installedqty || 0) || 0,
                    reorderLevel:     parseFloat(norm.reorder_level || norm.reorderlevel || 0) || 0,
                    unitCostUsd:      parseFloat(norm.unit_cost_usd || norm.unit_cost || 0) || 0,
                    supplier:         norm.supplier || '',
                    poNumber:         norm.po_number || norm.ponumber || '',
                    expectedDelivery: norm.expected_delivery || norm.expecteddelivery || null,
                    actualDelivery:   norm.actual_delivery   || norm.actualdelivery   || null,
                    deliveryStatus,
                    linkedMilestone:  norm.linked_milestone  || norm.linkedmilestone  || '',
                    milestoneDate:    norm.milestone_date    || norm.milestonedate    || null,
                    componentIds:     norm.component_ids ? norm.component_ids.split(';') : [],
                });
            }

            await MaterialUsage.deleteMany({ projectId });
            await MaterialUsage.insertMany(records);

            const doc = await registerUploadedDocument({
                projectId,
                buffer: req.file.buffer,
                originalName: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size,
                category: 'material-import',
                userId: req.userId
            });

            res.json({
                success: true,
                importedCount: records.length,
                totalRows: rows.length,
                documentId: doc ? doc._id : null
            });

        } catch (err) {
            console.error('Material Usage upload failed:', err);
            res.status(500).json({ error: 'Material Usage upload failed: ' + err.message });
        }
    }
);

// GET /projects/:projectId/materials
router.get('/projects/:projectId/materials', auth, async (req, res) => {
    try {
        const { projectId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json({ error: 'Invalid project id' });
        }
        const records = await MaterialUsage.find({ projectId }).sort({ category: 1, materialName: 1 });
        res.json(records);
    } catch (err) {
        console.error('Failed to fetch materials:', err);
        res.status(500).json({ error: 'Failed to fetch materials' });
    }
});

// DELETE /projects/:projectId/materials
router.delete('/projects/:projectId/materials', auth, requireRole('admin'), async (req, res) => {
    try {
        const { projectId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json({ error: 'Invalid project id' });
        }
        const result = await MaterialUsage.deleteMany({ projectId });
        res.json({ success: true, deleted: result.deletedCount });
    } catch (err) {
        console.error('Clear materials failed:', err);
        res.status(500).json({ error: 'Failed to clear data' });
    }
});

export default router;
