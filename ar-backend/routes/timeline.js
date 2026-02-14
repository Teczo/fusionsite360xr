import express from 'express';
import mongoose from 'mongoose';
import Timeline from '../models/Timeline.js';
import Project from '../models/Project.js';
import auth from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbac.js';

const router = express.Router();

// Helper: verify project exists and user has access
async function verifyProject(projectId, userId) {
  if (!mongoose.Types.ObjectId.isValid(projectId)) return null;
  return Project.findOne({ _id: projectId, userId });
}

// GET /projects/:id/timeline
router.get('/projects/:id/timeline', auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid project id' });
    }
    const items = await Timeline.find({ projectId: id }).sort({ date: -1 });
    res.json(items);
  } catch (err) {
    console.error('Failed to fetch timeline:', err);
    res.status(500).json({ error: 'Failed to fetch timeline' });
  }
});

// POST /projects/:id/timeline
router.post('/projects/:id/timeline', auth, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const project = await verifyProject(id, req.userId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const { title, description, date, type } = req.body;
    if (!title || !date) {
      return res.status(400).json({ error: 'title and date are required' });
    }

    const item = new Timeline({
      projectId: id,
      title,
      description: description || '',
      date,
      type: type || 'progress_update',
      createdBy: req.userId,
    });
    await item.save();
    res.status(201).json(item);
  } catch (err) {
    console.error('Failed to create timeline item:', err);
    res.status(500).json({ error: 'Failed to create timeline item' });
  }
});

// PUT /projects/:id/timeline/:timelineId
router.put('/projects/:id/timeline/:timelineId', auth, requireRole('admin'), async (req, res) => {
  try {
    const { id, timelineId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(timelineId)) {
      return res.status(400).json({ error: 'Invalid timeline id' });
    }

    const project = await verifyProject(id, req.userId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const { title, description, date, type } = req.body;
    const item = await Timeline.findOneAndUpdate(
      { _id: timelineId, projectId: id },
      { title, description, date, type },
      { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ error: 'Timeline item not found' });
    res.json(item);
  } catch (err) {
    console.error('Failed to update timeline item:', err);
    res.status(500).json({ error: 'Failed to update timeline item' });
  }
});

// DELETE /projects/:id/timeline/:timelineId
router.delete('/projects/:id/timeline/:timelineId', auth, requireRole('admin'), async (req, res) => {
  try {
    const { id, timelineId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(timelineId)) {
      return res.status(400).json({ error: 'Invalid timeline id' });
    }

    const project = await verifyProject(id, req.userId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const item = await Timeline.findOneAndDelete({ _id: timelineId, projectId: id });
    if (!item) return res.status(404).json({ error: 'Timeline item not found' });
    res.json({ message: 'Timeline item deleted' });
  } catch (err) {
    console.error('Failed to delete timeline item:', err);
    res.status(500).json({ error: 'Failed to delete timeline item' });
  }
});

export default router;
