import mongoose from 'mongoose';
import { routeIntent } from '../services/ai/intentRouter.js';
import { generateExplanation } from '../services/ai/explanationService.js';
import Project from '../models/Project.js';

export async function handleAIQuery(req, res) {
  const { projectId, question } = req.body;
  try {
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ success: false, error: 'Invalid projectId format' });
    }

    const project = await Project.findOne({ _id: projectId, userId: req.userId }).lean();
    if (!project) {
      return res.status(403).json({ success: false, error: 'You do not have access to this project' });
    }

    const { intent, result } = await routeIntent(projectId, question);
    const explanation = await generateExplanation(intent, result);
    res.json({ success: true, intent, data: result, explanation: explanation ?? null });
  } catch (err) {
    console.error('AI Query Error:', err);
    res.status(500).json({ success: false, error: 'An internal error occurred. Please try again.' });
  }
}
