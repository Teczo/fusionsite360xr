import express from 'express';
import mongoose from 'mongoose';
import HSE from '../models/HSE.js';
import Project from '../models/Project.js';
import auth from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbac.js';

const router = express.Router();

async function verifyProject(projectId, userId) {
  if (!mongoose.Types.ObjectId.isValid(projectId)) return null;
  return Project.findOne({ _id: projectId, userId });
}

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

    const { title, description, severity, date } = req.body;
    if (!title || !severity || !date) {
      return res.status(400).json({ error: 'title, severity, and date are required' });
    }

    const item = new HSE({
      projectId: id,
      title,
      description: description || '',
      severity,
      date,
      createdBy: req.userId,
    });
    await item.save();
    res.status(201).json(item);
  } catch (err) {
    console.error('Failed to create HSE incident:', err);
    res.status(500).json({ error: 'Failed to create HSE incident' });
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

    const { title, description, severity, date } = req.body;
    const item = await HSE.findOneAndUpdate(
      { _id: hseId, projectId: id },
      { title, description, severity, date },
      { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ error: 'HSE incident not found' });
    res.json(item);
  } catch (err) {
    console.error('Failed to update HSE incident:', err);
    res.status(500).json({ error: 'Failed to update HSE incident' });
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

export default router;
