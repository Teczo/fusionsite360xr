import express from 'express';
import mongoose from 'mongoose';
import Issue from '../models/Issue.js';
import Project from '../models/Project.js';
import User from '../models/User.js';
import auth from '../middleware/authMiddleware.js';
import { attachRole } from '../middleware/rbac.js';

const router = express.Router();

// ─── Validation constants ──────────────────────────────────────────────────────
const VALID_STATUSES   = ['Open', 'In Progress', 'Closed'];
const VALID_SEVERITIES = ['Critical', 'Warning', 'Info'];
const VALID_TYPES      = ['RFI', 'Observation', 'Safety', 'Clash', 'Defect'];

// ─── Helpers ───────────────────────────────────────────────────────────────────
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

// Attach populated user fields (createdBy, assignedTo, history.userId) to a lean issue.
// Returns the issue with populated references resolved.
async function populateIssue(issueDoc) {
  return Issue.findById(issueDoc._id ?? issueDoc.id)
    .populate('createdBy',  'name email role')
    .populate('assignedTo', 'name email role')
    .populate('history.userId', 'name email')
    .lean();
}

// ─── GET /api/projects/:projectId/members ─────────────────────────────────────
// Returns assignable users: project owner + teamMembers.
router.get('/projects/:projectId/members', auth, async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ error: 'Invalid project id' });
    }

    const project = await Project.findById(projectId).lean();
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const memberIds = [project.userId, ...(project.teamMembers || [])].filter(Boolean);
    const uniqueIds = [...new Set(memberIds.map(String))];

    const users = await User.find({ _id: { $in: uniqueIds } })
      .select('name email role')
      .lean();

    res.json(users);
  } catch (err) {
    console.error('Failed to fetch project members:', err);
    res.status(500).json({ error: 'Failed to fetch project members' });
  }
});

// ─── GET /api/projects/:projectId/issues ──────────────────────────────────────
// All authenticated users can list issues.
router.get('/projects/:projectId/issues', auth, async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ error: 'Invalid project id' });
    }

    const issues = await Issue.find({ projectId })
      .sort({ createdAt: -1 })
      .populate('createdBy',      'name email role')
      .populate('assignedTo',     'name email role')
      .populate('history.userId', 'name email')
      .lean();

    res.json(issues);
  } catch (err) {
    console.error('Failed to fetch issues:', err);
    res.status(500).json({ error: 'Failed to fetch issues' });
  }
});

// ─── POST /api/projects/:projectId/issues ─────────────────────────────────────
// All authenticated users can create issues (initial status = 'Open').
router.post('/projects/:projectId/issues', auth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await verifyProject(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const { title, description, severity, type, position } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'title is required' });
    }
    if (!severity || !VALID_SEVERITIES.includes(severity)) {
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
      title:       title.trim(),
      description: description || '',
      severity,
      type:        type || 'Observation',
      position:    { x: position.x, y: position.y, z: position.z },
      createdBy:   req.userId,
      status:      'Open',
      history:     [{ action: 'created', userId: req.userId }],
    });

    await issue.save();

    const populated = await populateIssue(issue);
    broadcast(projectId, { type: 'issue_created', issue: populated });
    res.status(201).json(populated);
  } catch (err) {
    console.error('Failed to create issue:', err);
    res.status(500).json({ error: 'Failed to create issue' });
  }
});

// ─── PATCH /api/issues/:issueId ────────────────────────────────────────────────
// Editable fields: title, description, severity, type, status, assignedTo, dueDate.
// Workflow rules enforced server-side.
router.patch('/issues/:issueId', auth, attachRole, async (req, res) => {
  try {
    const { issueId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(issueId)) {
      return res.status(400).json({ error: 'Invalid issue id' });
    }

    const issue = await Issue.findById(issueId);
    if (!issue) return res.status(404).json({ error: 'Issue not found' });

    const isAdmin    = req.userRole === 'admin';
    const isCreator  = String(issue.createdBy) === String(req.userId);
    const isAssigned = issue.assignedTo && String(issue.assignedTo) === String(req.userId);

    // At minimum the user must be creator, assignee, or admin for any mutation
    if (!isAdmin && !isCreator && !isAssigned) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { title, description, severity, type, status, assignedTo, dueDate } = req.body;

    // ── title / description ────────────────────────────────────────────────────
    if (title !== undefined) {
      if (!isAdmin && !isCreator) {
        return res.status(403).json({ error: 'Only the creator or admin can edit the title' });
      }
      if (!String(title).trim()) return res.status(400).json({ error: 'title cannot be empty' });
      issue.title = String(title).trim();
    }

    if (description !== undefined) {
      if (!isAdmin && !isCreator) {
        return res.status(403).json({ error: 'Only the creator or admin can edit the description' });
      }
      issue.description = description;
    }

    // ── severity / type ────────────────────────────────────────────────────────
    if (severity !== undefined) {
      if (!isAdmin) return res.status(403).json({ error: 'Only admin can change severity' });
      if (!VALID_SEVERITIES.includes(severity)) {
        return res.status(400).json({ error: `severity must be one of: ${VALID_SEVERITIES.join(', ')}` });
      }
      issue.severity = severity;
    }

    if (type !== undefined) {
      if (!isAdmin && !isCreator) {
        return res.status(403).json({ error: 'Only the creator or admin can change the type' });
      }
      if (!VALID_TYPES.includes(type)) {
        return res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` });
      }
      issue.type = type;
    }

    // ── status (workflow enforcement) ─────────────────────────────────────────
    if (status !== undefined && status !== issue.status) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
      }

      // Only assignedTo user or admin may move to In Progress or Closed
      if ((status === 'In Progress' || status === 'Closed') && !isAdmin && !isAssigned) {
        return res.status(403).json({
          error: `Only the assigned user or admin can mark an issue as "${status}"`,
        });
      }

      const from = issue.status;
      issue.status = status;
      if (status === 'Closed') issue.resolvedAt = new Date();
      if (status === 'Open')   issue.resolvedAt = null;

      issue.history.push({
        action:    'status_changed',
        userId:    req.userId,
        timestamp: new Date(),
        meta:      { from, to: status },
      });
    }

    // ── assignedTo ─────────────────────────────────────────────────────────────
    if (assignedTo !== undefined) {
      if (!isAdmin && !isCreator) {
        return res.status(403).json({ error: 'Only the creator or admin can change assignment' });
      }

      if (assignedTo === null || assignedTo === '') {
        issue.assignedTo = null;
        issue.history.push({
          action:    'unassigned',
          userId:    req.userId,
          timestamp: new Date(),
        });
      } else {
        if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
          return res.status(400).json({ error: 'Invalid assignedTo user id' });
        }
        // Validate the assignee exists
        const assignee = await User.findById(assignedTo).select('_id name').lean();
        if (!assignee) return res.status(404).json({ error: 'Assigned user not found' });

        issue.assignedTo = assignedTo;
        issue.history.push({
          action:    'assigned',
          userId:    req.userId,
          timestamp: new Date(),
          meta:      { assignedTo: assignedTo, assigneeName: assignee.name },
        });
      }
    }

    // ── dueDate ────────────────────────────────────────────────────────────────
    if (dueDate !== undefined) {
      if (!isAdmin && !isCreator) {
        return res.status(403).json({ error: 'Only the creator or admin can set the due date' });
      }

      const parsed = dueDate ? new Date(dueDate) : null;
      if (dueDate && isNaN(parsed)) {
        return res.status(400).json({ error: 'Invalid dueDate value' });
      }
      issue.dueDate = parsed;
      issue.history.push({
        action:    'due_date_set',
        userId:    req.userId,
        timestamp: new Date(),
        meta:      { dueDate: parsed?.toISOString() ?? null },
      });
    }

    await issue.save();

    const populated = await populateIssue(issue);
    broadcast(issue.projectId, { type: 'issue_updated', issue: populated });
    res.json(populated);
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
      return res.status(403).json({
        error: 'Only the creator or an admin can delete this issue',
      });
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
