import express from 'express';
import mongoose from 'mongoose';
import SCurve from '../models/SCurve.js';
import Project from '../models/Project.js';
import auth from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbac.js';

const router = express.Router();

async function verifyProject(projectId, userId) {
  if (!mongoose.Types.ObjectId.isValid(projectId)) return null;
  return Project.findOne({ _id: projectId, userId });
}

// GET /projects/:id/s-curve
router.get('/projects/:id/s-curve', auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid project id' });
    }
    const data = await SCurve.findOne({ projectId: id });
    if (!data) {
      return res.json({ projectId: id, baseline: [], actual: [] });
    }
    res.json(data);
  } catch (err) {
    console.error('Failed to fetch S-curve:', err);
    res.status(500).json({ error: 'Failed to fetch S-curve data' });
  }
});

// PUT /projects/:id/s-curve
router.put('/projects/:id/s-curve', auth, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const project = await verifyProject(id, req.userId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const { baseline, actual } = req.body;
    if (!Array.isArray(baseline) || !Array.isArray(actual)) {
      return res.status(400).json({ error: 'baseline and actual must be arrays' });
    }

    const data = await SCurve.findOneAndUpdate(
      { projectId: id },
      { baseline, actual, updatedBy: req.userId },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(data);
  } catch (err) {
    console.error('Failed to update S-curve:', err);
    res.status(500).json({ error: 'Failed to update S-curve data' });
  }
});

export default router;
