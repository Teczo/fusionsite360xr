import express from 'express';
import { handleAIQuery } from '../controllers/aiController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import requireActiveSubscription from '../middleware/requireActiveSubscription.js';

const router = express.Router();

router.post('/query', authMiddleware, requireActiveSubscription, (req, res, next) => {
  const { projectId, question } = req.body;
  if (!projectId || !question) {
    return res.status(400).json({ success: false, error: 'projectId and question are required' });
  }
  next();
}, handleAIQuery);

export default router;
