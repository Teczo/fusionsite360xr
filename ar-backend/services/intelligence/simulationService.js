import mongoose from 'mongoose';
import ScheduleActivity from '../../models/ScheduleActivity.js';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

// ─── simulateCascadingDelay ───────────────────────────────────────────────────
// Uses Mongo _id for graph traversal (correct architecture).
// Does NOT persist any changes to DB.
export async function simulateCascadingDelay(projectId, activityId, delayDays) {

  console.log("----- SIMULATION DEBUG START -----");
  console.log("Incoming projectId:", projectId);
  console.log("Incoming activityId:", activityId);
  console.log("Incoming delayDays:", delayDays);

  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    throw new Error("Invalid projectId format");
  }

  if (!mongoose.Types.ObjectId.isValid(activityId)) {
    throw new Error("ActivityId must be a valid Mongo ObjectId");
  }

  const pid = new mongoose.Types.ObjectId(projectId);
  const rootId = new mongoose.Types.ObjectId(activityId);

  console.log("Converted projectId:", pid.toString());
  console.log("Converted activityId:", rootId.toString());

  const allActivities = await ScheduleActivity
    .find({ projectId: pid })
    .lean();

  console.log("Total activities fetched:", allActivities.length);

  if (!allActivities.length) {
    return { impactedActivities: [], totalProjectDelay: 0 };
  }

  // ─── Build activity map keyed by Mongo _id ────────────────────────────────
  const activityMap = new Map();
  for (const act of allActivities) {
    activityMap.set(String(act._id), act);
  }

  console.log("ActivityMap keys:", Array.from(activityMap.keys()));

  // ─── Build successor adjacency map (_id based) ────────────────────────────
  const successorMap = new Map();
  for (const act of allActivities) {
    successorMap.set(
      String(act._id),
      (act.successors ?? []).map(id => String(id))
    );
  }

  // ─── Validate root exists ──────────────────────────────────────────────────
  if (!activityMap.has(String(rootId))) {
    throw new Error(`Activity not found: ${activityId}`);
  }

  const impactedActivities = [];
  const visited = new Set();

  function propagate(currentId, propagatedDelay) {

    if (visited.has(currentId)) return;
    visited.add(currentId);

    const act = activityMap.get(currentId);
    if (!act) return;

    const originalFinish = act.plannedFinish
      ? new Date(act.plannedFinish)
      : null;

    const newFinish = originalFinish
      ? new Date(originalFinish.getTime() + propagatedDelay * MS_PER_DAY)
      : null;

    impactedActivities.push({
      _id: currentId,
      activityId: act.activityId,
      originalFinish,
      newFinish,
      propagatedDelay
    });

    const successorIds = successorMap.get(currentId) ?? [];

    for (const successorId of successorIds) {
      propagate(successorId, propagatedDelay);
    }
  }

  propagate(String(rootId), delayDays);

  const totalProjectDelay = impactedActivities.length
    ? Math.max(...impactedActivities.map(a => a.propagatedDelay))
    : 0;

  console.log("Impacted activities:", impactedActivities.map(a => a.activityId));

  return {
    impactedActivities,
    totalProjectDelay
  };
}


// ─── detectManpowerConflicts ──────────────────────────────────────────────────
export async function detectManpowerConflicts(projectId, windowStart, windowEnd) {

  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    throw new Error("Invalid projectId format");
  }

  const pid = new mongoose.Types.ObjectId(projectId);
  const start = new Date(windowStart);
  const end = new Date(windowEnd);

  const activities = await ScheduleActivity.find({
    projectId: pid,
    plannedStart: { $lt: end },
    plannedFinish: { $gt: start }
  }).lean();

  if (activities.length < 2) return [];

  const zoneConflictMap = new Map();

  for (let i = 0; i < activities.length; i++) {
    for (let j = i + 1; j < activities.length; j++) {

      const a = activities[i];
      const b = activities[j];

      const aStart = a.plannedStart ? new Date(a.plannedStart) : null;
      const aFinish = a.plannedFinish ? new Date(a.plannedFinish) : null;
      const bStart = b.plannedStart ? new Date(b.plannedStart) : null;
      const bFinish = b.plannedFinish ? new Date(b.plannedFinish) : null;

      if (!aStart || !aFinish || !bStart || !bFinish) continue;

      const overlaps = aStart < bFinish && aFinish > bStart;
      if (!overlaps) continue;

      const zoneId = 'unassigned';

      if (!zoneConflictMap.has(zoneId)) {
        zoneConflictMap.set(zoneId, new Set());
      }

      const activitySet = zoneConflictMap.get(zoneId);
      activitySet.add(a.activityId || String(a._id));
      activitySet.add(b.activityId || String(b._id));
    }
  }

  const result = [];
  for (const [zoneId, activitySet] of zoneConflictMap) {
    result.push({
      zoneId,
      conflictingActivities: Array.from(activitySet)
    });
  }

  return result;
}