// intelligenceDevRoutes.js
// DEV ONLY — mounted by server.js only when NODE_ENV !== 'production'.
// All three routes delegate directly to the dev controller; no auth required
// (access is controlled by the conditional mount in server.js).

import { Router } from 'express';
import {
  simulateDelay,
  getOverdue,
  getPortfolioDrivers,
} from '../../controllers/dev/intelligenceDevController.js';

const router = Router();

// POST /api/dev/intelligence/simulate-delay
router.post('/simulate-delay', simulateDelay);

// GET /api/dev/intelligence/overdue/:projectId
router.get('/overdue/:projectId', getOverdue);

// GET /api/dev/intelligence/portfolio-drivers
router.get('/portfolio-drivers', getPortfolioDrivers);

export default router;
