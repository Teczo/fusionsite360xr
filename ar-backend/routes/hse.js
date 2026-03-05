import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import csv from 'csv-parser';
import { Readable } from 'stream';
import { BlobServiceClient } from '@azure/storage-blob';
import HSE from '../models/HSE.js';
import ProjectDocument from '../models/ProjectDocument.js';
import Project from '../models/Project.js';
import auth from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbac.js';

const router = express.Router();

const SEVERITY_WEIGHTS = { Critical: 3, Warning: 2, Info: 1 };
function getSeverityWeight(severity) {
  return SEVERITY_WEIGHTS[severity] ?? 0;
}

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Helper to upload file to Azure Blob Storage
async function uploadToAzure(file, projectId) {
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!conn) throw new Error('Azure configuration missing');

  const blobServiceClient = BlobServiceClient.fromConnectionString(conn);
  const containerClient = blobServiceClient.getContainerClient('uploads');

  const originalName = file.originalname;
  const timestamp = Date.now();
  const blobName = `projects/${projectId}/documents/${timestamp}-hse-${originalName}`;
  const blockBlob = containerClient.getBlockBlobClient(blobName);

  await blockBlob.uploadData(file.buffer, {
    blobHTTPHeaders: { blobContentType: file.mimetype },
  });

  return {
    blobUrl: blockBlob.url,
    size: file.size,
    name: originalName,
    type: file.mimetype
  };
}

async function verifyProject(projectId, userId) {
  if (!mongoose.Types.ObjectId.isValid(projectId)) return null;
  // Check if project exists and user has access (for now just existence check based on other routes)
  // In a real app, strict RBAC should be enforced here.
  return Project.findOne({ _id: projectId });
}

// POST /projects/:id/hse/import
router.post('/projects/:id/hse/import', auth, upload.single('file'), async (req, res) => {
  try {
    const { id: projectId } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    if (req.file.mimetype !== 'text/csv' && !req.file.originalname.endsWith('.csv')) {
      return res.status(400).json({ error: 'Only CSV files are allowed' });
    }

    const project = await verifyProject(projectId, req.userId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    // 1. Upload to Azure
    let uploadResult;
    try {
      uploadResult = await uploadToAzure(req.file, projectId);
    } catch (err) {
      console.error('Azure upload failed:', err);
      return res.status(500).json({ error: 'Failed to upload file to storage' });
    }

    // 2. Create ProjectDocument record
    const doc = new ProjectDocument({
      projectId,
      fileName: uploadResult.name,
      fileType: 'csv',
      fileSize: uploadResult.size,
      blobUrl: uploadResult.blobUrl,
      uploadedBy: req.userId,
      documentCategory: 'ai-dataset',
      datasetType: 'hse',
    });
    await doc.save();

    // 3. Parse CSV
    const results = [];
    const errors = [];
    const stream = Readable.from(req.file.buffer.toString());

    await new Promise((resolve, reject) => {
      stream
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    // 4. Transform and Validate Data
    const validIncidents = [];

    // Required fields mapping (CSV Header -> Schema Field)
    // Assumes CSV headers match schema fields or simple mapping
    // Expected: incidentId, date, zone, activity, severity, injuryType, rootCause, contractor, weatherCondition, description

    for (const row of results) {
      // Basic validation
      if (!row.date || !row.severity || !row.title) {
        // If title missing, maybe use description or activity? 
        // User request says expected columns: incidentId... description. 
        // HSE Schema requires: title, severity, date.
        // Let's map 'activity' or 'description' to 'title' if 'title' is missing in CSV, 
        // or ensure CSV has 'title' or 'activity' acts as title.
        // Re-reading user request: "Expected CSV columns: ... activity ... description"
        // Schema: "title: { type: String, required: true }"
        // Decision: Use 'activity' as 'title' if 'title' not present.

        if (!row.title && !row.activity) {
          continue; // Skip invalid rows
        }
      }

      validIncidents.push({
        projectId,
        title: row.title || row.activity || 'Untitled Incident',
        description: row.description || '',
        severity: row.severity,
        date: new Date(row.date),
        zoneId: row.zoneId || row.zone || '',
        source: 'csv-import',
        importedFromDocumentId: doc._id,
        createdBy: req.userId,
        computedSeverityWeight: getSeverityWeight(row.severity),
        incidentType: row.incidentType || '',
        isLTI: row.isLTI === 'true' || row.isLTI === '1',
        manhours: Number(row.manhours) || 0,
        status: row.status || 'Open',
        subcontractor: row.subcontractor || '',
        supervisor: row.supervisor || '',
        permitType: row.permitType || '',
        permitActive: row.permitActive === 'true' || row.permitActive === '1',
        complianceCategory: row.complianceCategory || '',
        closedAt: row.closedAt ? new Date(row.closedAt) : null,
      });
    }

    if (validIncidents.length > 0) {
      await HSE.insertMany(validIncidents);
    }

    res.json({
      success: true,
      importedCount: validIncidents.length,
      totalRows: results.length,
      documentId: doc._id
    });

  } catch (err) {
    console.error('Import failed:', err);
    res.status(500).json({ error: 'Import failed: ' + err.message });
  }
});

// GET /projects/:id/hse
router.get('/projects/:id/hse', auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid project id' });
    }
    const items = await HSE.find({ projectId: id }).sort({ date: -1 });
    res.json(items);
  } catch (err) {
    console.error('Failed to fetch HSE incidents:', err);
    res.status(500).json({ error: 'Failed to fetch HSE incidents' });
  }
});

// POST /projects/:id/hse
router.post('/projects/:id/hse', auth, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const project = await verifyProject(id, req.userId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const {
      title, description, severity, date, zoneId, incidentDate,
      incidentType, isLTI, manhours, status, subcontractor, supervisor,
      permitType, permitActive, complianceCategory, closedAt,
    } = req.body;
    if (!title || !severity || !date) {
      return res.status(400).json({ error: 'title, severity, and date are required' });
    }

    const item = new HSE({
      projectId: id,
      title,
      description: description || '',
      severity,
      date,
      zoneId: zoneId || '',
      incidentDate: incidentDate || null,
      createdBy: req.userId,
      computedSeverityWeight: getSeverityWeight(severity),
      incidentType: incidentType || '',
      isLTI: isLTI === true || isLTI === 'true',
      manhours: Number(manhours) || 0,
      status: status || 'Open',
      subcontractor: subcontractor || '',
      supervisor: supervisor || '',
      permitType: permitType || '',
      permitActive: permitActive === true || permitActive === 'true',
      complianceCategory: complianceCategory || '',
      closedAt: closedAt || null,
    });
    await item.save();
    return res.status(201).json(item);
  } catch (err) {
    console.error('Failed to create HSE incident:', err);
    if (err.name === 'ValidationError' || err.name === 'CastError') {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Failed to create HSE incident' });
  }
});

// PUT /projects/:id/hse/:hseId
router.put('/projects/:id/hse/:hseId', auth, requireRole('admin'), async (req, res) => {
  try {
    const { id, hseId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(hseId)) {
      return res.status(400).json({ error: 'Invalid HSE id' });
    }

    const project = await verifyProject(id, req.userId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const {
      title, description, severity, date, zoneId, incidentDate,
      incidentType, isLTI, manhours, status, subcontractor, supervisor,
      permitType, permitActive, complianceCategory, closedAt,
    } = req.body;

    const updateFields = {
      title, description, severity, date, zoneId, incidentDate,
      incidentType, subcontractor, supervisor, permitType, complianceCategory,
      status, closedAt,
    };
    if (isLTI !== undefined) updateFields.isLTI = isLTI === true || isLTI === 'true';
    if (manhours !== undefined) updateFields.manhours = Number(manhours) || 0;
    if (permitActive !== undefined) updateFields.permitActive = permitActive === true || permitActive === 'true';

    // Recalculate computedSeverityWeight whenever severity is changed
    if (severity !== undefined) {
      updateFields.computedSeverityWeight = getSeverityWeight(severity);
    }

    const item = await HSE.findOneAndUpdate(
      { _id: hseId, projectId: id },
      updateFields,
      { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ error: 'HSE incident not found' });
    return res.json(item);
  } catch (err) {
    console.error('Failed to update HSE incident:', err);
    if (err.name === 'ValidationError' || err.name === 'CastError') {
      return res.status(400).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Failed to update HSE incident' });
  }
});

// DELETE /projects/:id/hse/:hseId
router.delete('/projects/:id/hse/:hseId', auth, requireRole('admin'), async (req, res) => {
  try {
    const { id, hseId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(hseId)) {
      return res.status(400).json({ error: 'Invalid HSE id' });
    }

    const project = await verifyProject(id, req.userId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const item = await HSE.findOneAndDelete({ _id: hseId, projectId: id });
    if (!item) return res.status(404).json({ error: 'HSE incident not found' });
    res.json({ message: 'HSE incident deleted' });
  } catch (err) {
    console.error('Failed to delete HSE incident:', err);
    res.status(500).json({ error: 'Failed to delete HSE incident' });
  }
});

// DELETE /projects/:id/hse
router.delete('/projects/:id/hse', auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid project id' });
    }
    const result = await HSE.deleteMany({ projectId: id });
    res.json({ success: true, deleted: result.deletedCount });
  } catch (err) {
    console.error('Clear HSE failed:', err);
    res.status(500).json({ error: 'Failed to clear data' });
  }
});

export default router;
