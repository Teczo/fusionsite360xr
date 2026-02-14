import express from 'express';
import mongoose from 'mongoose';
import Alert from '../models/Alert.js';
import Project from '../models/Project.js';
import auth from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbac.js';

const router = express.Router();

async function verifyProject(projectId, userId) {
  if (!mongoose.Types.ObjectId.isValid(projectId)) return null;
  return Project.findOne({ _id: projectId, userId });
}

// GET /projects/:id/alerts
router.get('/projects/:id/alerts', auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid project id' });
    }
    const items = await Alert.find({ projectId: id }).sort({ date: -1 });
    res.json(items);
  } catch (err) {
    console.error('Failed to fetch alerts:', err);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// POST /projects/:id/alerts
router.post('/projects/:id/alerts', auth, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const project = await verifyProject(id, req.userId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const { title, severity, source, date } = req.body;
    if (!title || !severity || !date) {
      return res.status(400).json({ error: 'title, severity, and date are required' });
    }

    const item = new Alert({
      projectId: id,
      title,
      severity,
      source: source || 'manual',
      date,
      createdBy: req.userId,
    });
    await item.save();
    res.status(201).json(item);
  } catch (err) {
    console.error('Failed to create alert:', err);
    res.status(500).json({ error: 'Failed to create alert' });
  }
});

// PUT /projects/:id/alerts/:alertId
router.put('/projects/:id/alerts/:alertId', auth, requireRole('admin'), async (req, res) => {
  try {
    const { id, alertId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(alertId)) {
      return res.status(400).json({ error: 'Invalid alert id' });
    }

    const project = await verifyProject(id, req.userId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const { title, severity, source, date } = req.body;
    const item = await Alert.findOneAndUpdate(
      { _id: alertId, projectId: id },
      { title, severity, source, date },
      { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ error: 'Alert not found' });
    res.json(item);
  } catch (err) {
    console.error('Failed to update alert:', err);
    res.status(500).json({ error: 'Failed to update alert' });
  }
});

// DELETE /projects/:id/alerts/:alertId
router.delete('/projects/:id/alerts/:alertId', auth, requireRole('admin'), async (req, res) => {
  try {
    const { id, alertId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(alertId)) {
      return res.status(400).json({ error: 'Invalid alert id' });
    }

    const project = await verifyProject(id, req.userId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const item = await Alert.findOneAndDelete({ _id: alertId, projectId: id });
    if (!item) return res.status(404).json({ error: 'Alert not found' });
    res.json({ message: 'Alert deleted' });
  } catch (err) {
    console.error('Failed to delete alert:', err);
    res.status(500).json({ error: 'Failed to delete alert' });
  }
});

export default router;
