import Project from '../../models/Project.js';
import ContractorPerformance from '../../models/ContractorPerformance.js';

// ─── getPortfolioDelayDrivers ─────────────────────────────────────────────────
// Queries completed projects and aggregates delay metrics.
//
// Note: The Project schema does not contain `totalDelayPercent` or
// `majorRiskFactors` fields. Until those fields are added to the schema,
// this function returns 0 / [] defaults and exposes the raw project count.
export async function getPortfolioDelayDrivers() {
  const projects = await Project.find({ status: 'Completed' }).lean();

  let totalDelayPercentSum = 0;
  const riskFactorFrequency = new Map();

  for (const project of projects) {
    // totalDelayPercent is not on the schema; defaults to 0
    totalDelayPercentSum += project.totalDelayPercent ?? 0;

    // majorRiskFactors is not on the schema; defaults to []
    for (const factor of project.majorRiskFactors ?? []) {
      riskFactorFrequency.set(factor, (riskFactorFrequency.get(factor) ?? 0) + 1);
    }
  }

  const count = projects.length;
  const avgDelayPercent = count > 0 ? totalDelayPercentSum / count : 0;

  // Sort risk factors by frequency descending
  const topRiskFactors = Array.from(riskFactorFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([factor, frequency]) => ({ factor, frequency }));

  return {
    completedProjectCount: count,
    avgDelayPercent,
    topRiskFactors,
  };
}

// ─── getHistoricalRiskStats ───────────────────────────────────────────────────
// Returns average risk metrics across all completed projects.
//
// Note: `incidentRate`, `costOverrunPercent`, and `delayPercent` are not fields
// on the Project schema. Until those fields are added, this function returns
// zeroed defaults alongside the raw project count.
export async function getHistoricalRiskStats() {
  const projects = await Project.find({ status: 'Completed' }).lean();

  let incidentRateSum = 0;
  let costOverrunSum = 0;
  let delayPercentSum = 0;

  for (const project of projects) {
    incidentRateSum += project.incidentRate ?? 0;
    costOverrunSum += project.costOverrunPercent ?? 0;
    delayPercentSum += project.delayPercent ?? 0;
  }

  const count = projects.length;

  return {
    completedProjectCount: count,
    avgIncidentRate: count > 0 ? incidentRateSum / count : 0,
    avgCostOverrunPercent: count > 0 ? costOverrunSum / count : 0,
    avgDelayPercent: count > 0 ? delayPercentSum / count : 0,
  };
}

// ─── getContractorPortfolioRanking ────────────────────────────────────────────
// Aggregates ContractorPerformance across all projects and returns a ranked list
// sorted by avgDelayDays DESC then incidentRate DESC.
//
// ContractorPerformance has no dedicated `contractorId` field; `_id` is exposed
// under that key for consumer convenience.
export async function getContractorPortfolioRanking() {
  const contractors = await ContractorPerformance
    .find({})
    .sort({ avgDelayDays: -1, incidentRate: -1 })
    .lean();

  return contractors.map((c, index) => ({
    rank: index + 1,
    contractorId: c._id,
    contractorName: c.contractorName,
    projectId: c.projectId,
    avgDelayDays: c.avgDelayDays,
    incidentRate: c.incidentRate,
    reworkFrequency: c.reworkFrequency,
    totalActivities: c.totalActivities,
  }));
}
