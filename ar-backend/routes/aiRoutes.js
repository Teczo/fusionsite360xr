import express from 'express';
import { handleAIQuery } from '../controllers/aiController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import requireActiveSubscription from '../middleware/requireActiveSubscription.js';
import AIAuditLog from '../models/AIAuditLog.js';

const router = express.Router();

router.post('/query', authMiddleware, requireActiveSubscription, (req, res, next) => {
  const { projectId, question } = req.body;
  if (!projectId || !question) {
    return res.status(400).json({ success: false, error: 'projectId and question are required' });
  }
  next();
}, handleAIQuery);

// POST /api/ai/feedback — Submit feedback on an AI response
router.post('/feedback', authMiddleware, async (req, res) => {
  try {
    const { auditLogId, feedback, comment } = req.body;

    if (!auditLogId) {
      return res.status(400).json({ success: false, error: 'auditLogId is required' });
    }

    if (!['helpful', 'unhelpful'].includes(feedback)) {
      return res.status(400).json({ success: false, error: 'feedback must be "helpful" or "unhelpful"' });
    }

    const log = await AIAuditLog.findOneAndUpdate(
      { _id: auditLogId, userId: req.userId },  // Ownership: users can only rate their own queries
      {
        userFeedback: feedback,
        feedbackComment: comment?.substring(0, 500) || null
      },
      { new: true }
    );

    if (!log) {
      return res.status(404).json({ success: false, error: 'Audit log entry not found' });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Feedback submission error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to save feedback' });
  }
});

// GET /api/ai/history — Get the user's recent AI query history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const projectId = req.query.projectId;

    const filter = { userId: req.userId };
    if (projectId) filter.projectId = projectId;

    const history = await AIAuditLog.find(filter)
      .select('question intent provider toolsCalled isMultiStep responseTimeMs success userFeedback createdAt -_id')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.json({ success: true, data: history });
  } catch (err) {
    console.error('History fetch error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch history' });
  }
});

export default router;
