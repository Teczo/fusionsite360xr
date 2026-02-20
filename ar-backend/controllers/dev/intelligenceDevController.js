// intelligenceDevController.js
// DEV ONLY — safe wrapper around intelligence services for debug console.
// Does NOT duplicate logic. Does NOT modify any existing service or model.
// Remove this file (along with routes/dev/ and the server.js mount) to fully
// disable the debug console.

import {
  queryService,
  simulationService,
  portfolioService,
} from '../../services/intelligence/index.js';

// POST /api/dev/intelligence/simulate-delay
// Body: { projectId, activityId, delayDays }
export async function simulateDelay(req, res) {
  try {
    const { projectId, activityId, delayDays } = req.body;
    const result = await simulationService.simulateCascadingDelay(
      projectId,
      activityId,
      Number(delayDays),
    );
    res.json(result);
  } catch (err) {
    console.error('[dev/simulate-delay]', err);
    res.status(500).json({ error: err.message });
  }
}

// GET /api/dev/intelligence/overdue/:projectId
export async function getOverdue(req, res) {
  try {
    const result = await queryService.getOverdueActivities(req.params.projectId);
    res.json(result);
  } catch (err) {
    console.error('[dev/overdue]', err);
    res.status(500).json({ error: err.message });
  }
}

// GET /api/dev/intelligence/portfolio-drivers
export async function getPortfolioDrivers(req, res) {
  try {
    const result = await portfolioService.getPortfolioDelayDrivers();
    res.json(result);
  } catch (err) {
    console.error('[dev/portfolio-drivers]', err);
    res.status(500).json({ error: err.message });
  }
}
