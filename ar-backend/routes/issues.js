import express from 'express';
import mongoose from 'mongoose';
import Issue from '../models/Issue.js';
import Project from '../models/Project.js';
import auth from '../middleware/authMiddleware.js';
import { attachRole } from '../middleware/rbac.js';

const router = express.Router();

// Validates projectId and checks project exists
async function verifyProject(projectId) {
  if (!mongoose.Types.ObjectId.isValid(projectId)) return null;
  return Project.findById(projectId).lean();
}

// Broadcast a WebSocket message to all sockets watching a project.
// broadcastToProject is injected by server.js at startup.
let _broadcast = null;
export function setBroadcast(fn) {
  _broadcast = fn;
}

function broadcast(projectId, payload) {
  if (_broadcast) _broadcast(String(projectId), payload);
}

// ─── GET /api/projects/:projectId/issues ─────────────────────────────────────
// All authenticated users can list issues for a project.
router.get('/projects/:projectId/issues', auth, async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ error: 'Invalid project id' });
    }

    const issues = await Issue.find({ projectId }).sort({ createdAt: -1 }).lean();
    res.json(issues);
  } catch (err) {
    console.error('Failed to fetch issues:', err);
    res.status(500).json({ error: 'Failed to fetch issues' });
  }
});

// ─── POST /api/projects/:projectId/issues ─────────────────────────────────────
// All authenticated users can create issues.
router.post('/projects/:projectId/issues', auth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await verifyProject(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const { title, description, severity, type, position } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'title is required' });
    }
    if (!severity || !['Critical', 'Warning', 'Info'].includes(severity)) {
      return res.status(400).json({ error: 'severity must be Critical, Warning, or Info' });
    }
    if (
      !position ||
      typeof position.x !== 'number' ||
      typeof position.y !== 'number' ||
      typeof position.z !== 'number'
    ) {
      return res.status(400).json({ error: 'position with numeric x, y, z is required' });
    }

    const issue = new Issue({
      projectId,
      title: title.trim(),
      description: description || '',
      severity,
      type: type || 'Observation',
      position: {
        x: position.x,
        y: position.y,
        z: position.z,
      },
      createdBy: req.userId,
    });
    await issue.save();

    broadcast(projectId, { type: 'issue_created', issue });
    res.status(201).json(issue);
  } catch (err) {
    console.error('Failed to create issue:', err);
    res.status(500).json({ error: 'Failed to create issue' });
  }
});

// ─── PATCH /api/issues/:issueId ───────────────────────────────────────────────
// Creator can update their own issue. Admin can update any issue.
router.patch('/issues/:issueId', auth, attachRole, async (req, res) => {
  try {
    const { issueId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(issueId)) {
      return res.status(400).json({ error: 'Invalid issue id' });
    }

    const issue = await Issue.findById(issueId);
    if (!issue) return res.status(404).json({ error: 'Issue not found' });

    const isOwner = String(issue.createdBy) === String(req.userId);
    const isAdmin = req.userRole === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const VALID_STATUSES   = ['Not Started', 'In Progress', 'Completed', 'Delayed', 'On Hold'];
    const VALID_SEVERITIES = ['Critical', 'Warning', 'Info'];
    const VALID_TYPES      = ['RFI', 'Observation', 'Safety', 'Clash', 'Defect'];

    const { title, description, severity, status, type } = req.body;

    if (title !== undefined) {
      if (!String(title).trim()) return res.status(400).json({ error: 'title cannot be empty' });
      issue.title = String(title).trim();
    }
    if (description !== undefined) issue.description = description;
    if (severity !== undefined) {
      if (!VALID_SEVERITIES.includes(severity)) {
        return res.status(400).json({ error: `severity must be one of: ${VALID_SEVERITIES.join(', ')}` });
      }
      issue.severity = severity;
    }
    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
      }
      issue.status = status;
      if (status === 'Completed') issue.resolvedAt = new Date();
    }
    if (type !== undefined) {
      if (!VALID_TYPES.includes(type)) {
        return res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` });
      }
      issue.type = type;
    }

    await issue.save();
    broadcast(issue.projectId, { type: 'issue_updated', issue });
    res.json(issue);
  } catch (err) {
    console.error('Failed to update issue:', err);
    res.status(500).json({ error: 'Failed to update issue' });
  }
});

// ─── DELETE /api/issues/:issueId ──────────────────────────────────────────────
// Creator can delete their own issue. Admin can delete any issue.
router.delete('/issues/:issueId', auth, attachRole, async (req, res) => {
  try {
    const { issueId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(issueId)) {
      return res.status(400).json({ error: 'Invalid issue id' });
    }

    const issue = await Issue.findById(issueId);
    if (!issue) return res.status(404).json({ error: 'Issue not found' });

    const isOwner = String(issue.createdBy) === String(req.userId);
    const isAdmin = req.userRole === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Insufficient permissions: only the creator or an admin can delete this issue' });
    }

    const projectId = issue.projectId;
    await issue.deleteOne();
    broadcast(projectId, { type: 'issue_deleted', issueId });
    res.json({ message: 'Issue deleted' });
  } catch (err) {
    console.error('Failed to delete issue:', err);
    res.status(500).json({ error: 'Failed to delete issue' });
  }
});

export default router;
