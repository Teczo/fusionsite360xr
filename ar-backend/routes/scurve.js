import express from 'express';
import mongoose from 'mongoose';
import SCurve from '../models/SCurve.js';
import ScheduleActivity from '../models/ScheduleActivity.js';
import Project from '../models/Project.js';
import auth from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbac.js';

const router = express.Router();

async function verifyProject(projectId, userId) {
  if (!mongoose.Types.ObjectId.isValid(projectId)) return null;
  return Project.findOne({ _id: projectId, userId });
}

/* ------------------------------------------------------------------ */
/*  S-Curve auto-calculation from ScheduleActivity records            */
/* ------------------------------------------------------------------ */
async function generateSCurve(projectId) {
  const activities = await ScheduleActivity.find({ projectId }).lean();

  // Keep only activities with valid planned dates
  const validActivities = activities.filter(a => a.plannedStart && a.plannedFinish);
  if (validActivities.length === 0) return { baseline: [], actual: [] };

  // Project date boundaries
  const allStarts = validActivities.map(a => new Date(a.plannedStart));
  const allFinishes = validActivities.map(a => new Date(a.plannedFinish));

  const projectStart = new Date(Math.min(...allStarts));
  const projectEnd = new Date(Math.max(...allFinishes));
  const today = new Date();

  // Weight each activity by its planned duration
  const enriched = validActivities.map(a => {
    const pStart = new Date(a.plannedStart);
    const pFinish = new Date(a.plannedFinish);
    const aStart = a.actualStart ? new Date(a.actualStart) : null;
    const aFinish = a.actualFinish ? new Date(a.actualFinish) : null;
    const plannedDays = Math.max(1, (pFinish - pStart) / (1000 * 60 * 60 * 24));
    const status = a.status || 'Not Started';
    return { pStart, pFinish, aStart, aFinish, plannedDays, status };
  });

  const totalPlannedDays = enriched.reduce((sum, a) => sum + a.plannedDays, 0);

  // Use daily intervals for short projects (< 4 weeks), otherwise weekly
  const projectSpanMs = projectEnd - projectStart;
  const fourWeeksMs = 28 * 24 * 60 * 60 * 1000;
  const intervalMs = projectSpanMs < fourWeeksMs
    ? 1 * 24 * 60 * 60 * 1000   // daily
    : 7 * 24 * 60 * 60 * 1000;  // weekly

  const baseline = [];
  const actual = [];

  for (let d = new Date(projectStart); d <= projectEnd; d = new Date(d.getTime() + intervalMs)) {
    const cur = new Date(d);

    // --- BASELINE ---
    let baselineProgress = 0;
    for (const a of enriched) {
      if (cur < a.pStart) {
        // not yet started in plan
      } else if (cur >= a.pFinish) {
        baselineProgress += a.plannedDays;
      } else {
        const elapsed = (cur - a.pStart) / (1000 * 60 * 60 * 24);
        baselineProgress += elapsed;
      }
    }
    baseline.push({
      date: cur.toISOString().split('T')[0],
      value: Math.round((baselineProgress / totalPlannedDays) * 100 * 10) / 10,
    });

    // --- ACTUAL (only up to today) ---
    if (cur <= today) {
      let actualProgress = 0;
      for (const a of enriched) {
        if (a.aFinish && cur >= a.aFinish) {
          actualProgress += a.plannedDays;
        } else if (a.status === 'Completed') {
          actualProgress += a.plannedDays;
        } else if (a.aStart && cur >= a.aStart) {
          const elapsed = (cur - a.aStart) / (1000 * 60 * 60 * 24);
          const fraction = Math.min(elapsed / a.plannedDays, 0.95);
          actualProgress += fraction * a.plannedDays;
        }
      }
      actual.push({
        date: cur.toISOString().split('T')[0],
        value: Math.round((actualProgress / totalPlannedDays) * 100 * 10) / 10,
      });
    }
  }

  // Ensure baseline always ends exactly at the project end date at 100 %
  const lastDate = baseline[baseline.length - 1]?.date;
  const endStr = projectEnd.toISOString().split('T')[0];
  if (lastDate !== endStr) {
    baseline.push({ date: endStr, value: 100 });
  }

  return { baseline, actual };
}

// GET /projects/:id/s-curve
router.get('/projects/:id/s-curve', auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid project id' });
    }
    const data = await SCurve.findOne({ projectId: id });
    if (!data) {
      return res.json({ projectId: id, baseline: [], actual: [] });
    }
    res.json(data);
  } catch (err) {
    console.error('Failed to fetch S-curve:', err);
    res.status(500).json({ error: 'Failed to fetch S-curve data' });
  }
});

// PUT /projects/:id/s-curve
router.put('/projects/:id/s-curve', auth, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const project = await verifyProject(id, req.userId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const { baseline, actual } = req.body;
    if (!Array.isArray(baseline) || !Array.isArray(actual)) {
      return res.status(400).json({ error: 'baseline and actual must be arrays' });
    }

    // Derived variance fields
    const latestBaseline = baseline.length > 0 ? baseline[baseline.length - 1].value : 0;
    const latestActual = actual.length > 0 ? actual[actual.length - 1].value : 0;
    const variance = latestActual - latestBaseline;
    const variancePercent =
      latestBaseline === 0
        ? 0
        : ((latestActual - latestBaseline) / latestBaseline) * 100;

    const data = await SCurve.findOneAndUpdate(
      { projectId: id },
      { baseline, actual, updatedBy: req.userId, variance, variancePercent },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(data);
  } catch (err) {
    console.error('Failed to update S-curve:', err);
    res.status(500).json({ error: 'Failed to update S-curve data' });
  }
});

// POST /projects/:id/s-curve/generate  — auto-calculate from schedule data
router.post('/projects/:id/s-curve/generate', auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid project id' });
    }

    const count = await ScheduleActivity.countDocuments({ projectId: id });
    if (count === 0) {
      return res.status(400).json({ error: 'No schedule data found. Upload a schedule CSV first.' });
    }

    const { baseline, actual } = await generateSCurve(id);

    // Compute variance from latest data points
    const latestBaseline = baseline.length > 0 ? baseline[baseline.length - 1].value : 0;
    const latestActual = actual.length > 0 ? actual[actual.length - 1].value : 0;
    const variance = latestActual - latestBaseline;
    const variancePercent =
      latestBaseline === 0
        ? 0
        : ((latestActual - latestBaseline) / latestBaseline) * 100;

    await SCurve.findOneAndUpdate(
      { projectId: id },
      { projectId: id, baseline, actual, updatedBy: req.userId, variance, variancePercent },
      { upsert: true, new: true, runValidators: true },
    );

    res.json({ success: true, baseline, actual, activitiesUsed: count });
  } catch (err) {
    console.error('S-Curve generation failed:', err);
    res.status(500).json({ error: 'Failed to generate S-Curve' });
  }
});

export default router;
