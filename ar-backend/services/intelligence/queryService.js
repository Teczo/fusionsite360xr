import mongoose from 'mongoose';
import BIMComponent from '../../models/BIMComponent.js';
import ScheduleActivity from '../../models/ScheduleActivity.js';
import Cost from '../../models/Cost.js';
import HSE from '../../models/HSE.js';
import Issue from '../../models/Issue.js';
import ContractorPerformance from '../../models/ContractorPerformance.js';

// ─── 1. getQuantityByElementType ─────────────────────────────────────────────
// BIMComponent uses the field `type` (not `elementType`); we query on it and
// surface the result under the caller-facing key `elementType`.
export async function getQuantityByElementType(projectId, elementType) {
  const pid = new mongoose.Types.ObjectId(projectId);
  const quantity = await BIMComponent.countDocuments({ projectId: pid, type: elementType });
  return { elementType, quantity };
}

// ─── 2. getActivitiesByStatus ─────────────────────────────────────────────────
export async function getActivitiesByStatus(projectId, status) {
  const pid = new mongoose.Types.ObjectId(projectId);
  const activities = await ScheduleActivity
    .find({ projectId: pid, status })
    .select('activityId name plannedFinish actualFinish -_id')
    .lean();
  return activities;
}

// ─── 3. getActivitiesCompletingThisWeek ───────────────────────────────────────
export async function getActivitiesCompletingThisWeek(projectId) {
  const pid = new mongoose.Types.ObjectId(projectId);
  const now = new Date();

  // ISO week: Monday = day 1, Sunday = day 0
  const day = now.getDay(); // 0=Sun … 6=Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() + diffToMonday);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const activities = await ScheduleActivity
    .find({ projectId: pid, plannedFinish: { $gte: startOfWeek, $lte: endOfWeek } })
    .lean();

  return activities;
}

// ─── 4. getOverdueActivities ──────────────────────────────────────────────────
export async function getOverdueActivities(projectId) {
  const pid = new mongoose.Types.ObjectId(projectId);
  const activities = await ScheduleActivity
    .find({ projectId: pid, isDelayed: true })
    .select('activityId delayDays plannedFinish actualFinish -_id')
    .lean();
  return activities;
}

// ─── 5. getCostByPhase ────────────────────────────────────────────────────────
export async function getCostByPhase(projectId, phase) {
  const pid = new mongoose.Types.ObjectId(projectId);
  const result = await Cost.aggregate([
    { $match: { projectId: pid, phase } },
    {
      $group: {
        _id: '$phase',
        totalPlannedCost: { $sum: '$plannedCost' },
        totalActualCost: { $sum: '$actualCost' },
        avgVariancePercent: { $avg: '$costVariancePercent' },
      },
    },
  ]);

  if (!result.length) {
    return { phase, totalPlannedCost: 0, totalActualCost: 0, avgVariancePercent: 0 };
  }

  const row = result[0];
  return {
    phase: row._id,
    totalPlannedCost: row.totalPlannedCost,
    totalActualCost: row.totalActualCost,
    avgVariancePercent: row.avgVariancePercent,
  };
}

// ─── 6. getMonthlyIncidentCount ───────────────────────────────────────────────
export async function getMonthlyIncidentCount(projectId, month, year) {
  const pid = new mongoose.Types.ObjectId(projectId);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  const totalIncidents = await HSE.countDocuments({
    projectId: pid,
    incidentDate: { $gte: startDate, $lt: endDate },
  });

  return { month, year, totalIncidents };
}

// ─── 7. getElementMetadata ────────────────────────────────────────────────────
// BIMComponent uses `componentId` as its unique GUID field.
export async function getElementMetadata(bimGuid) {
  const component = await BIMComponent.findOne({ componentId: bimGuid }).lean();
  if (!component) {
    throw new Error(`BIMComponent not found for componentId: ${bimGuid}`);
  }

  let activity = null;
  if (component.activityId) {
    activity = await ScheduleActivity.findOne({ activityId: component.activityId }).lean();
  }

  return {
    component,
    activity: activity ?? null,
  };
}

// ─── 8. getCostAnomalies ──────────────────────────────────────────────────────
export async function getCostAnomalies(projectId, thresholdPercent) {
  const pid = new mongoose.Types.ObjectId(projectId);
  const anomalies = await Cost
    .find({ projectId: pid, costVariancePercent: { $gt: thresholdPercent } })
    .lean();

  anomalies.sort((a, b) => b.costVariancePercent - a.costVariancePercent);
  return anomalies;
}

// ─── 9. rankContractorsByDelay ────────────────────────────────────────────────
// ContractorPerformance has no dedicated `contractorId` field; we expose `_id`.
export async function rankContractorsByDelay(projectId) {
  const pid = new mongoose.Types.ObjectId(projectId);
  const contractors = await ContractorPerformance
    .find({ projectId: pid })
    .sort({ avgDelayDays: -1 })
    .lean();

  return contractors.map(c => ({
    contractorId: c._id,
    contractorName: c.contractorName,
    avgDelayDays: c.avgDelayDays,
  }));
}

// ─── 10. getZoneIssueDensity ──────────────────────────────────────────────────
export async function getZoneIssueDensity(projectId) {
  const pid = new mongoose.Types.ObjectId(projectId);
  const result = await Issue.aggregate([
    { $match: { projectId: pid } },
    {
      $group: {
        _id: '$zoneId',
        issueCount: { $sum: 1 },
      },
    },
    { $sort: { issueCount: -1 } },
  ]);

  return result.map(r => ({ zoneId: r._id, issueCount: r.issueCount }));
}

// ─── 11. predictZoneSafetyRisk ────────────────────────────────────────────────
// Heuristic: incidentRate per zone = zoneIncidents / totalProjectIncidents.
// riskScore = incidentRate * 1.2 (static weight, no ML).
export async function predictZoneSafetyRisk(projectId) {
  const pid = new mongoose.Types.ObjectId(projectId);
  const hseRecords = await HSE.find({ projectId: pid }).lean();

  const totalIncidents = hseRecords.length;
  if (totalIncidents === 0) return [];

  // Group by zoneId
  const zoneMap = new Map();
  for (const record of hseRecords) {
    const zoneId = record.zoneId || 'unassigned';
    zoneMap.set(zoneId, (zoneMap.get(zoneId) ?? 0) + 1);
  }

  const zones = [];
  for (const [zoneId, count] of zoneMap) {
    const incidentRate = count / totalIncidents;
    const riskScore = incidentRate * 1.2;
    zones.push({ zoneId, incidentCount: count, incidentRate, riskScore });
  }

  zones.sort((a, b) => b.riskScore - a.riskScore);
  return zones;
}
