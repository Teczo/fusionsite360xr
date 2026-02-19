import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { getProjectSnapshot } from '../services/intelligence/projectSnapshot.service.js';
import { getOverdueActivities } from '../services/intelligence/overdueActivities.service.js';
import { getIncidentStats } from '../services/intelligence/incidentStats.service.js';
import { getScheduleVariance } from '../services/intelligence/scheduleVariance.service.js';
import { getActivityRisk } from '../services/intelligence/activityRisk.service.js';
import { buildDependencyGraph } from '../services/intelligence/dependencyGraph.service.js';
import { getProjectDataHealth } from '../services/intelligence/dataHealth.service.js';

const router = Router();

// All intelligence endpoints require authentication
router.use(authMiddleware);

// GET /api/projects/:id/intelligence/snapshot
router.get('/projects/:id/intelligence/snapshot', async (req, res) => {
  try {
    const data = await getProjectSnapshot(req.params.id);
    res.json(data);
  } catch (err) {
    console.error('[intelligence/snapshot]', err);
    res.status(500).json({ error: 'Failed to compute project snapshot' });
  }
});

// GET /api/projects/:id/intelligence/overdue
router.get('/projects/:id/intelligence/overdue', async (req, res) => {
  try {
    const data = await getOverdueActivities(req.params.id);
    res.json(data);
  } catch (err) {
    console.error('[intelligence/overdue]', err);
    res.status(500).json({ error: 'Failed to compute overdue activities' });
  }
});

// GET /api/projects/:id/intelligence/incidents
router.get('/projects/:id/intelligence/incidents', async (req, res) => {
  try {
    const data = await getIncidentStats(req.params.id);
    res.json(data);
  } catch (err) {
    console.error('[intelligence/incidents]', err);
    res.status(500).json({ error: 'Failed to compute incident stats' });
  }
});

// GET /api/projects/:id/intelligence/schedule-variance
router.get('/projects/:id/intelligence/schedule-variance', async (req, res) => {
  try {
    const data = await getScheduleVariance(req.params.id);
    res.json(data);
  } catch (err) {
    console.error('[intelligence/schedule-variance]', err);
    res.status(500).json({ error: 'Failed to compute schedule variance' });
  }
});

// GET /api/projects/:id/intelligence/activity-risk
router.get('/projects/:id/intelligence/activity-risk', async (req, res) => {
  try {
    const data = await getActivityRisk(req.params.id);
    res.json(data);
  } catch (err) {
    console.error('[intelligence/activity-risk]', err);
    res.status(500).json({ error: 'Failed to compute activity risk' });
  }
});

// GET /api/projects/:id/intelligence/dependency-graph
router.get('/projects/:id/intelligence/dependency-graph', async (req, res) => {
  try {
    const data = await buildDependencyGraph(req.params.id);
    res.json(data);
  } catch (err) {
    console.error('[intelligence/dependency-graph]', err);
    res.status(500).json({ error: 'Failed to build dependency graph' });
  }
});

// GET /api/projects/:id/data-health
router.get('/projects/:id/data-health', async (req, res) => {
  try {
    const data = await getProjectDataHealth(req.params.id);
    res.json(data);
  } catch (err) {
    console.error('[data-health]', err);
    res.status(500).json({ error: 'Failed to compute data health' });
  }
});

export default router;
