import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import csv from 'csv-parser';
import { Readable } from 'stream';
import BIMComponent from '../models/BIMComponent.js';
import Project from '../models/Project.js';
import auth from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbac.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

async function verifyProject(projectId) {
  if (!mongoose.Types.ObjectId.isValid(projectId)) return null;
  return Project.findOne({ _id: projectId });
}

function parseNum(v) {
  const n = parseFloat(v);
  return isNaN(n) ? undefined : n;
}

function parseDate(v) {
  if (!v || v.trim() === '') return undefined;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d;
}

// POST /api/projects/:projectId/bim/upload
router.post(
  '/projects/:projectId/bim/upload',
  auth,
  requireRole('admin'),
  upload.single('file'),
  async (req, res) => {
    try {
      const { projectId } = req.params;

      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      if (req.file.mimetype !== 'text/csv' && !req.file.originalname.endsWith('.csv')) {
        return res.status(400).json({ error: 'Only CSV files are allowed' });
      }

      const project = await verifyProject(projectId);
      if (!project) return res.status(404).json({ error: 'Project not found' });

      const rows = [];
      await new Promise((resolve, reject) => {
        Readable.from(req.file.buffer.toString())
          .pipe(csv())
          .on('data', (row) => rows.push(row))
          .on('end', resolve)
          .on('error', reject);
      });

      if (rows.length === 0) {
        return res.status(400).json({ error: 'CSV file is empty or has no data rows' });
      }

      const ops = rows
        .filter((row) => row.element_guid && row.element_guid.trim() !== '')
        .map((row) => ({
          updateOne: {
            filter: { projectId, element_guid: row.element_guid.trim() },
            update: {
              $set: {
                projectId,
                element_guid:           row.element_guid?.trim(),
                model_id:               row.model_id?.trim() || undefined,
                element_name:           row.element_name?.trim() || undefined,
                category:               row.category?.trim() || undefined,
                subcategory:            row.subcategory?.trim() || undefined,
                discipline:             row.discipline?.trim() || undefined,
                phase:                  row.phase?.trim() || undefined,
                level_zone:             row.level_zone?.trim() || undefined,
                volume_m3:              parseNum(row.volume_m3),
                area_m2:                parseNum(row.area_m2),
                length_m:               parseNum(row.length_m),
                material:               row.material?.trim() || undefined,
                weight_kg:              parseNum(row.weight_kg),
                planned_start:          parseDate(row.planned_start),
                planned_finish:         parseDate(row.planned_finish),
                actual_start:           parseDate(row.actual_start),
                actual_finish:          parseDate(row.actual_finish),
                status:                 row.status?.trim() || undefined,
                responsible_contractor: row.responsible_contractor?.trim() || undefined,
                work_package_id:        row.work_package_id?.trim() || undefined,
                mep_density_score:      parseNum(row.mep_density_score),
              },
            },
            upsert: true,
          },
        }));

      if (ops.length === 0) {
        return res.status(400).json({ error: 'No valid rows found — element_guid is required for all rows' });
      }

      const result = await BIMComponent.bulkWrite(ops, { ordered: false });

      res.json({
        success: true,
        totalRows: rows.length,
        processedRows: ops.length,
        upsertedCount: result.upsertedCount,
        modifiedCount: result.modifiedCount,
      });
    } catch (err) {
      console.error('[BIM] Upload failed:', err);
      res.status(500).json({ error: 'BIM upload failed: ' + err.message });
    }
  }
);

// GET /api/projects/:projectId/bim/:elementGuid
router.get('/projects/:projectId/bim/:elementGuid', auth, async (req, res) => {
  try {
    const { projectId, elementGuid } = req.params;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    const component = await BIMComponent.findOne({
      projectId,
      element_guid: decodeURIComponent(elementGuid),
    }).lean();

    if (!component) {
      return res.status(404).json({ error: 'BIM component not found' });
    }

    res.json(component);
  } catch (err) {
    console.error('[BIM] Get component failed:', err);
    res.status(500).json({ error: 'Failed to fetch BIM component' });
  }
});

export default router;
