import mongoose from 'mongoose';
import SCurve from '../../models/SCurve.js';

// SCurve model uses 'baseline' for planned data.
// Response maps: baseline -> planned, actual -> actual.

export async function getScheduleVariance(projectId) {
  const pid = new mongoose.Types.ObjectId(projectId);

  const sCurve = await SCurve.findOne({ projectId: pid }).lean();

  if (!sCurve) {
    return {
      projectId: String(projectId),
      latest: { planned: 0, actual: 0, variance: 0, variancePercent: 0 },
      trend: [],
    };
  }

  const baseline = (sCurve.baseline || []).slice().sort((a, b) => new Date(a.date) - new Date(b.date));
  const actual = (sCurve.actual || []).slice().sort((a, b) => new Date(a.date) - new Date(b.date));

  // Latest values
  const latestPlanned = baseline.length > 0 ? baseline[baseline.length - 1].value : 0;
  const latestActual = actual.length > 0 ? actual[actual.length - 1].value : 0;
  const variance = latestActual - latestPlanned;
  const variancePercent = latestPlanned === 0 ? 0 : (variance / latestPlanned) * 100;

  // Build trend: merge both arrays by date into a unified timeline
  const dateMap = new Map();

  for (const pt of baseline) {
    const key = new Date(pt.date).toISOString().slice(0, 10);
    if (!dateMap.has(key)) dateMap.set(key, { date: key, planned: 0, actual: 0 });
    dateMap.get(key).planned = pt.value;
  }
  for (const pt of actual) {
    const key = new Date(pt.date).toISOString().slice(0, 10);
    if (!dateMap.has(key)) dateMap.set(key, { date: key, planned: 0, actual: 0 });
    dateMap.get(key).actual = pt.value;
  }

  const trend = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  return {
    projectId: String(projectId),
    latest: {
      planned: latestPlanned,
      actual: latestActual,
      variance,
      variancePercent: Math.round(variancePercent * 100) / 100,
    },
    trend,
  };
}
