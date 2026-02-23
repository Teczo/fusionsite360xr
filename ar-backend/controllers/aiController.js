import { routeIntent } from '../services/ai/intentRouter.js';
import { generateExplanation } from '../services/ai/explanationService.js';

export async function handleAIQuery(req, res) {
  const { projectId, question } = req.body;
  try {
    const { intent, result } = await routeIntent(projectId, question);
    const explanation = await generateExplanation(intent, result);
    res.json({ success: true, intent, data: result, explanation: explanation ?? null });
  } catch (err) {
    console.error('[aiController] error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}
