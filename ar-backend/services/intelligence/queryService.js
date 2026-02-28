import mongoose from 'mongoose';
import { generateEmbedding } from '../ai/embeddingService.js';
import BIMComponent from '../../models/BIMComponent.js';
import ScheduleActivity from '../../models/ScheduleActivity.js';
import Cost from '../../models/Cost.js';
import HSE from '../../models/HSE.js';
import Issue from '../../models/Issue.js';
import ContractorPerformance from '../../models/ContractorPerformance.js';
import Project from '../../models/Project.js';
import Assignment from '../../models/Assignment.js';
import MaterialUsage from '../../models/MaterialUsage.js';
import ProjectDocument from '../../models/ProjectDocument.js';

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

// ─── 12. getResponsibility ────────────────────────────────────────────────────
export async function getResponsibility(projectId, discipline) {
  const pid = new mongoose.Types.ObjectId(projectId);
  const filter = { projectId: pid };
  if (discipline) {
    filter.discipline = new RegExp(discipline, 'i');
  }
  const results = await Assignment
    .find(filter)
    .select('discipline contractor responsiblePerson zone status -_id')
    .lean();
  return results;
}

// ─── 13. getMaterialsByLevel ──────────────────────────────────────────────────
export async function getMaterialsByLevel(projectId, level) {
  const pid = new mongoose.Types.ObjectId(projectId);
  const filter = { projectId: pid };
  if (level) {
    filter.level = new RegExp(level, 'i');
  }
  const results = await MaterialUsage
    .find(filter)
    .select('level materialType quantity unit -_id')
    .lean();
  return results;
}

// ─── 14. searchProjectDocuments ───────────────────────────────────────────────
export async function searchProjectDocuments(projectId, query) {
  const objectId = new mongoose.Types.ObjectId(projectId);

  // If no query, return recent documents
  if (!query || !query.trim()) {
    return await ProjectDocument.find({ projectId: objectId })
      .select('fileName documentCategory fileType tags createdAt -_id')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
  }

  // Try vector search first
  const queryEmbedding = await generateEmbedding(query);

  if (queryEmbedding) {
    try {
      const vectorResults = await ProjectDocument.aggregate([
        {
          $vectorSearch: {
            index: 'document_vector_index',
            path: 'embedding',
            queryVector: queryEmbedding,
            numCandidates: 50,
            limit: 5,
            filter: { projectId: objectId }
          }
        },
        {
          $project: {
            fileName: 1,
            documentCategory: 1,
            fileType: 1,
            tags: 1,
            createdAt: 1,
            extractedText: { $substr: ['$extractedText', 0, 500] },
            score: { $meta: 'vectorSearchScore' }
          }
        }
      ]);

      if (vectorResults.length > 0) {
        return vectorResults;
      }
    } catch (vectorErr) {
      // Vector search failed — fall through to text search
      console.error('Vector search failed, falling back to text search:', vectorErr.message);
    }
  }

  // Fallback: basic text search (works without Atlas Vector Search index)
  try {
    return await ProjectDocument.find({
      projectId: objectId,
      $text: { $search: query }
    })
      .select('fileName documentCategory fileType tags createdAt -_id')
      .sort({ score: { $meta: 'textScore' } })
      .limit(10)
      .lean();
  } catch (textErr) {
    // Text search also failed (maybe no text index) — last resort: regex
    console.error('Text search failed, falling back to regex:', textErr.message);
    return await ProjectDocument.find({
      projectId: objectId,
      fileName: { $regex: query, $options: 'i' }
    })
      .select('fileName documentCategory fileType tags createdAt -_id')
      .limit(10)
      .lean();
  }
}

// ─── 15. getPortfolioOverview ─────────────────────────────────────────────────
// Takes userId (not projectId) — aggregates across all projects the user owns.
export async function getPortfolioOverview(userId) {
  const projects = await Project
    .find({ userId })
    .select('_id name status')
    .lean();

  if (!projects.length) {
    return { projectCount: 0, projects: [], summary: 'No projects found.' };
  }

  const projectIds = projects.map(p => p._id);

  const [totalIncidents, delayResult, costResult, delayFactorResults, projectDelayResults] = await Promise.all([
    HSE.countDocuments({ projectId: { $in: projectIds } }),
    ScheduleActivity.aggregate([
      { $match: { projectId: { $in: projectIds }, isDelayed: true } },
      { $group: { _id: null, avgDelay: { $avg: '$delayDays' }, totalDelayed: { $sum: 1 } } },
    ]),
    Cost.aggregate([
      { $match: { projectId: { $in: projectIds } } },
      { $group: {
        _id: null,
        totalPlanned: { $sum: '$plannedCost' },
        totalActual:  { $sum: '$actualCost' },
      }},
    ]),
    ScheduleActivity.aggregate([
      { $match: { projectId: { $in: projectIds }, isDelayed: true } },
      { $group: {
        _id: '$weatherSensitivity',
        count: { $sum: 1 },
        avgDelay: { $avg: '$delayDays' },
        totalDelay: { $sum: '$delayDays' }
      }},
      { $sort: { totalDelay: -1 } },
      { $limit: 5 }
    ]),
    ScheduleActivity.aggregate([
      { $match: { projectId: { $in: projectIds }, isDelayed: true } },
      { $group: {
        _id: '$projectId',
        delayedCount: { $sum: 1 },
        avgDelay: { $avg: '$delayDays' }
      }},
      { $sort: { avgDelay: -1 } },
      { $limit: 5 },
      { $lookup: {
        from: 'projects',
        localField: '_id',
        foreignField: '_id',
        as: 'project'
      }},
      { $unwind: { path: '$project', preserveNullAndEmptyArrays: true } },
      { $project: {
        projectName: '$project.name',
        delayedCount: 1,
        avgDelay: { $round: ['$avgDelay', 1] }
      }}
    ]),
  ]);

  return {
    projectCount: projects.length,
    projects: projects.map(p => ({ name: p.name, status: p.status })),
    totalIncidents,
    averageDelayDays:        delayResult[0]?.avgDelay?.toFixed(1) || 0,
    totalDelayedActivities:  delayResult[0]?.totalDelayed || 0,
    costSummary: costResult[0] ? {
      totalPlanned:    costResult[0].totalPlanned,
      totalActual:     costResult[0].totalActual,
      variancePercent: ((costResult[0].totalActual - costResult[0].totalPlanned) / costResult[0].totalPlanned * 100).toFixed(1),
    } : null,
    delayFactors: delayFactorResults.map(f => ({
      factor: f._id || 'Unspecified',
      delayedActivities: f.count,
      averageDelayDays: parseFloat(f.avgDelay?.toFixed(1)) || 0,
      totalDelayDays: f.totalDelay
    })),
    worstProjects: projectDelayResults.map(p => ({
      name: p.projectName || 'Unknown',
      delayedActivities: p.delayedCount,
      averageDelayDays: p.avgDelay
    }))
  };
}
