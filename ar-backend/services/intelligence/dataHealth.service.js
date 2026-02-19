import mongoose from 'mongoose';
import ScheduleActivity from '../../models/ScheduleActivity.js';
import HSE from '../../models/HSE.js';
import SCurve from '../../models/SCurve.js';
import Alert from '../../models/Alert.js';
import Project from '../../models/Project.js';

// Expected weight per severity level
const SEVERITY_WEIGHT = { Critical: 3, Warning: 2, Info: 1 };

// DFS-based cycle detection over the predecessors graph.
// Returns true if a cycle exists among the given activities.
function detectCycles(activities) {
  const adjList = new Map();
  for (const act of activities) {
    const id = act.activityId || String(act._id);
    if (!adjList.has(id)) adjList.set(id, []);
    for (const pred of (act.predecessors || [])) {
      adjList.get(id).push(pred);
    }
  }

  const visited = new Set();
  const inStack = new Set();

  function hasCycle(node) {
    if (inStack.has(node)) return true;
    if (visited.has(node)) return false;
    visited.add(node);
    inStack.add(node);
    for (const neighbor of (adjList.get(node) || [])) {
      if (hasCycle(neighbor)) return true;
    }
    inStack.delete(node);
    return false;
  }

  for (const id of adjList.keys()) {
    if (hasCycle(id)) return true;
  }
  return false;
}

export async function getProjectDataHealth(projectId) {
  const pid = new mongoose.Types.ObjectId(projectId);

  const [activities, hseRecords, sCurve, alerts, project] = await Promise.all([
    ScheduleActivity.find({ projectId: pid }).lean(),
    HSE.find({ projectId: pid }).lean(),
    SCurve.findOne({ projectId: pid }).lean(),
    Alert.find({ projectId: pid }).lean(),
    Project.findOne({ _id: pid }, { _id: 1 }).lean(),
  ]);

  // Build a set of all valid activityIds in this project (used by schedule + dependency checks)
  const activityIdSet = new Set(activities.map(a => a.activityId || String(a._id)));

  // ─── 1. Schedule Readiness ───────────────────────────────────────────────
  let missingDates = 0;
  let missingDerivedFields = 0;
  let invalidPredecessors = 0;

  for (const act of activities) {
    if (!act.plannedStart || !act.plannedFinish) missingDates++;
    if (act.delayDays == null || act.isDelayed == null || act.plannedDurationDays == null) {
      missingDerivedFields++;
    }
    for (const pred of (act.predecessors || [])) {
      if (!activityIdSet.has(pred)) invalidPredecessors++;
    }
  }

  const circularDependencyDetected = detectCycles(activities);
  const totalActivities = activities.length;

  const schedule = {
    totalActivities,
    missingDates,
    missingDerivedFields,
    invalidPredecessors,
    circularDependencyDetected,
    ready:
      totalActivities > 0 &&
      missingDates === 0 &&
      missingDerivedFields === 0 &&
      invalidPredecessors === 0 &&
      !circularDependencyDetected,
  };

  // ─── 2. HSE Readiness ────────────────────────────────────────────────────
  let missingSeverity = 0;
  let weightMismatch = 0;

  for (const inc of hseRecords) {
    if (!inc.severity || !SEVERITY_WEIGHT[inc.severity]) {
      missingSeverity++;
    } else if (inc.computedSeverityWeight !== SEVERITY_WEIGHT[inc.severity]) {
      weightMismatch++;
    }
  }

  const hse = {
    totalIncidents: hseRecords.length,
    missingSeverity,
    weightMismatch,
    ready: missingSeverity === 0 && weightMismatch === 0,
  };

  // ─── 3. SCurve Readiness ─────────────────────────────────────────────────
  const baselineArr = (sCurve?.baseline || []).slice().sort((a, b) => new Date(a.date) - new Date(b.date));
  const actualArr = (sCurve?.actual || []).slice().sort((a, b) => new Date(a.date) - new Date(b.date));
  const baselineCount = baselineArr.length;
  const actualCount = actualArr.length;

  let varianceMismatch = false;
  if (sCurve && baselineCount > 0 && actualCount > 0) {
    const lastBaseline = baselineArr[baselineCount - 1].value;
    const lastActual = actualArr[actualCount - 1].value;
    const expectedVariance = lastActual - lastBaseline;
    varianceMismatch = Math.abs((sCurve.variance ?? 0) - expectedVariance) >= 0.0001;
  }

  const sCurveResult = {
    exists: !!sCurve,
    baselineCount,
    actualCount,
    varianceMismatch,
    ready: !!sCurve && baselineCount > 0 && actualCount > 0 && !varianceMismatch,
  };

  // ─── 4. Alerts Integrity ─────────────────────────────────────────────────
  let alertsMissingSeverity = 0;
  for (const alert of alerts) {
    if (!alert.severity) alertsMissingSeverity++;
  }

  // Orphaned: alerts exist but project document does not
  const hasOrphanedAlerts = !project && alerts.length > 0;

  const alertsResult = {
    totalAlerts: alerts.length,
    missingSeverity: alertsMissingSeverity,
    ready: alertsMissingSeverity === 0 && !hasOrphanedAlerts,
  };

  // ─── 5. Dependency Graph Integrity ───────────────────────────────────────
  let totalEdges = 0;
  let depInvalidReferences = 0;

  for (const act of activities) {
    const selfId = act.activityId || String(act._id);
    const preds = act.predecessors || [];
    const succs = act.successors || [];

    totalEdges += preds.length;

    for (const pred of preds) {
      // Self-referencing or references a non-existent activity
      if (pred === selfId || !activityIdSet.has(pred)) depInvalidReferences++;
    }
    for (const succ of succs) {
      if (succ === selfId || !activityIdSet.has(succ)) depInvalidReferences++;
    }
  }

  const dependencies = {
    totalEdges,
    invalidReferences: depInvalidReferences,
    cyclesDetected: circularDependencyDetected,
    ready: depInvalidReferences === 0 && !circularDependencyDetected,
  };

  // ─── Overall ─────────────────────────────────────────────────────────────
  return {
    projectId: String(projectId),
    checkedAt: new Date().toISOString(),
    schedule,
    hse,
    sCurve: sCurveResult,
    alerts: alertsResult,
    dependencies,
    overallReady:
      schedule.ready &&
      hse.ready &&
      sCurveResult.ready &&
      alertsResult.ready &&
      dependencies.ready,
  };
}
