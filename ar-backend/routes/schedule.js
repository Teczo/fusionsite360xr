import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import csv from 'csv-parser';
import { Readable } from 'stream';
import { BlobServiceClient } from '@azure/storage-blob';
import ScheduleActivity from '../models/ScheduleActivity.js';
import ProjectDocument from '../models/ProjectDocument.js';
import Project from '../models/Project.js';
import auth from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbac.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const REQUIRED_COLUMNS = ['activity_id', 'activity_name', 'planned_start', 'planned_finish'];

async function uploadToAzure(file, projectId) {
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!conn) throw new Error('Azure configuration missing');

  const blobServiceClient = BlobServiceClient.fromConnectionString(conn);
  const containerClient = blobServiceClient.getContainerClient('uploads');

  const timestamp = Date.now();
  const blobName = `projects/${projectId}/documents/${timestamp}-schedule-${file.originalname}`;
  const blockBlob = containerClient.getBlockBlobClient(blobName);

  await blockBlob.uploadData(file.buffer, {
    blobHTTPHeaders: { blobContentType: file.mimetype },
  });

  return { blobUrl: blockBlob.url, size: file.size, name: file.originalname };
}

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

// POST /projects/:projectId/schedule/upload
router.post(
  '/projects/:projectId/schedule/upload',
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

      if (req.file.mimetype !== 'text/csv' && !req.file.originalname.endsWith('.csv')) {
        return res.status(400).json({ error: 'Only CSV files are allowed' });
      }

      const project = await Project.findById(projectId);
      if (!project) return res.status(404).json({ error: 'Project not found' });

      // 1. Parse CSV
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

      // 2. Validate required columns
      const headers = Object.keys(rows[0]).map((h) => h.trim().toLowerCase());
      const missing = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));
      if (missing.length > 0) {
        return res.status(400).json({
          error: `Missing required columns: ${missing.join(', ')}`,
        });
      }

      // 3. Transform and validate rows
      const activities = [];
      const skipped = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        // Normalize keys to lowercase trimmed
        const norm = {};
        for (const [k, v] of Object.entries(row)) {
          norm[k.trim().toLowerCase()] = v?.trim();
        }

        const plannedStart = parseDate(norm.planned_start);
        const plannedFinish = parseDate(norm.planned_finish);

        if (!norm.activity_id || !norm.activity_name || !plannedStart || !plannedFinish) {
          skipped.push(i + 2); // +2 for 1-based + header row
          continue;
        }

        const actualStart = parseDate(norm.actual_start);
        const actualFinish = parseDate(norm.actual_finish);
        const durationMs = plannedFinish.getTime() - plannedStart.getTime();
        const durationDays = Math.max(1, Math.round(durationMs / (1000 * 60 * 60 * 24)));

        // Derived fields
        const plannedDurationDays = Math.max(
          1,
          Math.round((plannedFinish.getTime() - plannedStart.getTime()) / 86400000)
        );

        const today = new Date();
        let delayDays;
        if (actualFinish) {
          delayDays = Math.max(0, Math.round((actualFinish.getTime() - plannedFinish.getTime()) / 86400000));
        } else if (plannedFinish < today) {
          delayDays = Math.round((today.getTime() - plannedFinish.getTime()) / 86400000);
        } else {
          delayDays = 0;
        }
        const isDelayed = delayDays > 0;

        const criticalRaw = (norm.critical_path || norm.critical || '').toLowerCase();
        const criticalPath = ['true', 'yes', '1'].includes(criticalRaw);

        const predecessors = norm.predecessors
          ? norm.predecessors.split(',').map(p => p.trim()).filter(Boolean)
          : [];

        const dependencyType =
          ['FS', 'SS', 'FF'].includes((norm.dependency_type || '').toUpperCase())
            ? norm.dependency_type.toUpperCase()
            : 'FS';

        activities.push({
          projectId,
          activityId: norm.activity_id,
          name: norm.activity_name,
          plannedStart,
          plannedFinish,
          actualStart,
          actualFinish,
          durationDays,
          plannedDurationDays,
          delayDays,
          isDelayed,
          criticalPath,
          weatherSensitivity: norm.weather_sensitivity || norm.weather || '',
          predecessors,
          successors: [],
          dependencyType,
        });
      }

      if (activities.length === 0) {
        return res.status(400).json({
          error: 'No valid activities found in CSV',
          skippedRows: skipped,
        });
      }

      // 4. Replace existing schedule for this project
      await ScheduleActivity.deleteMany({ projectId });

      // 5. Bulk insert
      await ScheduleActivity.insertMany(activities);

      // 5a. Compute successor links for bidirectional graph traversal
      const inserted = await ScheduleActivity.find({ projectId }).lean();
      const idToDoc = new Map(inserted.map(a => [a.activityId, a]));

      const successorUpdates = [];
      for (const act of inserted) {
        for (const predId of (act.predecessors || [])) {
          const predDoc = idToDoc.get(predId);
          if (predDoc) {
            successorUpdates.push({
              updateOne: {
                filter: { _id: predDoc._id },
                update: { $addToSet: { successors: act.activityId } },
              },
            });
          }
        }
      }
      if (successorUpdates.length > 0) {
        await ScheduleActivity.bulkWrite(successorUpdates);
      }

      // 6. Upload original file to Azure
      let uploadResult;
      try {
        uploadResult = await uploadToAzure(req.file, projectId);
      } catch (err) {
        console.error('Azure upload failed:', err);
        // Activities are already saved — proceed without blob
        return res.json({
          success: true,
          importedCount: activities.length,
          totalRows: rows.length,
          skippedRows: skipped,
          warning: 'Schedule saved but file upload to storage failed',
        });
      }

      // 7. Create ProjectDocument record
      const doc = new ProjectDocument({
        projectId,
        fileName: uploadResult.name,
        fileType: 'csv',
        fileSize: uploadResult.size,
        blobUrl: uploadResult.blobUrl,
        uploadedBy: req.userId,
        documentCategory: 'schedule',
        datasetType: 'schedule',
      });
      await doc.save();

      res.json({
        success: true,
        importedCount: activities.length,
        totalRows: rows.length,
        skippedRows: skipped,
        documentId: doc._id,
      });
    } catch (err) {
      console.error('Schedule upload failed:', err);
      res.status(500).json({ error: 'Schedule upload failed: ' + err.message });
    }
  }
);

// GET /projects/:projectId/schedule
router.get('/projects/:projectId/schedule', auth, async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ error: 'Invalid project id' });
    }

    const activities = await ScheduleActivity.find({ projectId }).sort({ plannedStart: 1 });
    res.json(activities);
  } catch (err) {
    console.error('Failed to fetch schedule:', err);
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

export default router;
