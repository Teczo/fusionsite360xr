import { Router } from 'express';
import ChatThread from '../models/ChatThread.js';
import ChatMessage from '../models/ChatMessage.js';
import authMiddleware from '../middleware/authMiddleware.js';
import requireActiveSubscription from '../middleware/requireActiveSubscription.js';

const router = Router();

// LIST threads for a project
router.get('/threads', authMiddleware, requireActiveSubscription, async (req, res) => {
  try {
    const { projectId } = req.query;
    if (!projectId) return res.status(400).json({ error: 'projectId required' });

    const threads = await ChatThread.find({
      userId: req.userId,
      projectId
    })
      .sort({ lastMessageAt: -1 })
      .limit(50)
      .lean();

    res.json(threads);
  } catch (err) {
    console.error('List threads failed:', err);
    res.status(500).json({ error: 'Failed to list threads' });
  }
});

// CREATE a new thread
router.post('/threads', authMiddleware, requireActiveSubscription, async (req, res) => {
  try {
    const { projectId, title } = req.body;
    if (!projectId) return res.status(400).json({ error: 'projectId required' });

    const thread = await ChatThread.create({
      userId: req.userId,
      projectId,
      title: title || 'New Chat'
    });

    res.status(201).json(thread);
  } catch (err) {
    console.error('Create thread failed:', err);
    res.status(500).json({ error: 'Failed to create thread' });
  }
});

// GET messages for a thread
router.get('/threads/:threadId/messages', authMiddleware, requireActiveSubscription, async (req, res) => {
  try {
    const { threadId } = req.params;

    // Verify ownership
    const thread = await ChatThread.findOne({ _id: threadId, userId: req.userId });
    if (!thread) return res.status(404).json({ error: 'Thread not found' });

    const messages = await ChatMessage.find({ threadId })
      .sort({ createdAt: 1 })
      .lean();

    res.json(messages);
  } catch (err) {
    console.error('Get messages failed:', err);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// DELETE a thread and all its messages
router.delete('/threads/:threadId', authMiddleware, async (req, res) => {
  try {
    const { threadId } = req.params;

    const thread = await ChatThread.findOne({ _id: threadId, userId: req.userId });
    if (!thread) return res.status(404).json({ error: 'Thread not found' });

    await ChatMessage.deleteMany({ threadId });
    await ChatThread.deleteOne({ _id: threadId });

    res.json({ success: true });
  } catch (err) {
    console.error('Delete thread failed:', err);
    res.status(500).json({ error: 'Failed to delete thread' });
  }
});

// RENAME a thread
router.patch('/threads/:threadId', authMiddleware, async (req, res) => {
  try {
    const { threadId } = req.params;
    const { title } = req.body;

    const thread = await ChatThread.findOneAndUpdate(
      { _id: threadId, userId: req.userId },
      { title },
      { new: true }
    );
    if (!thread) return res.status(404).json({ error: 'Thread not found' });

    res.json(thread);
  } catch (err) {
    console.error('Rename thread failed:', err);
    res.status(500).json({ error: 'Failed to rename thread' });
  }
});

export default router;
