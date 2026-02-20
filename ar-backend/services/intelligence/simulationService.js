import mongoose from 'mongoose';
import ScheduleActivity from '../../models/ScheduleActivity.js';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

// ─── simulateCascadingDelay ───────────────────────────────────────────────────
// Performs a pure in-memory dependency traversal.
// Does NOT persist any changes to the database.
//
// dependencyType semantics:
//   FS (Finish-to-Start) → successor start shifts by delay → finish shifts by delay
//   SS (Start-to-Start)  → successor start shifts by delay → finish shifts by delay
//   FF (Finish-to-Finish) → successor finish shifts by delay
//
// All three cases propagate the same integer delay forward through the graph.
export async function simulateCascadingDelay(projectId, activityId, delayDays) {
  // ── DEBUG START ──────────────────────────────────────────────────────────────
  console.log("----- SIMULATION DEBUG START -----");
  console.log("Incoming projectId:", projectId);
  console.log("Incoming activityId:", activityId);
  console.log("Incoming delayDays:", delayDays);

  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    console.error("Invalid projectId format:", projectId);
  }
  if (!mongoose.Types.ObjectId.isValid(activityId)) {
    console.warn("ActivityId is not a valid ObjectId (may be using logical activityId):", activityId);
  }
  // ── DEBUG END ────────────────────────────────────────────────────────────────

  const pid = new mongoose.Types.ObjectId(projectId);
  console.log("Converted projectId ObjectId:", pid.toString());
  const allActivities = await ScheduleActivity.find({ projectId: pid }).lean();
  console.log("Total activities fetched for project:", allActivities.length);
  console.log("Fetched activity IDs (_id):", allActivities.map(a => String(a._id)));
  console.log("Fetched activity activityId fields:", allActivities.map(a => a.activityId));

  if (!allActivities.length) {
    return { impactedActivities: [], totalProjectDelay: 0 };
  }

  // Build lookup: activityId → activity document
  const activityMap = new Map();
  for (const act of allActivities) {
    activityMap.set(act.activityId, act);
  }

  // Direct Atlas _id lookup — confirms document is reachable under current connection
  const directCheck = await ScheduleActivity.findOne({
    _id: mongoose.Types.ObjectId.isValid(activityId)
      ? new mongoose.Types.ObjectId(activityId)
      : null,
  }).lean();
  console.log("Direct _id lookup result:", directCheck ? "FOUND" : "NOT FOUND");

  // Build adjacency: activityId → successorActivityIds[]
  // Each activity stores its own successors array.
  const successorMap = new Map();
  for (const act of allActivities) {
    successorMap.set(act.activityId, act.successors ?? []);
  }

  const impactedActivities = [];
  const visited = new Set();

  function propagate(currentActivityId, propagatedDelay) {
    if (visited.has(currentActivityId)) return;
    visited.add(currentActivityId);

    const act = activityMap.get(currentActivityId);
    if (!act) return;

    const originalFinish = act.plannedFinish ? new Date(act.plannedFinish) : null;
    const newFinish = originalFinish
      ? new Date(originalFinish.getTime() + propagatedDelay * MS_PER_DAY)
      : null;

    impactedActivities.push({
      activityId: currentActivityId,
      originalFinish,
      newFinish,
      propagatedDelay,
    });

    const successorIds = successorMap.get(currentActivityId) ?? [];
    for (const successorId of successorIds) {
      const successor = activityMap.get(successorId);
      if (!successor) continue;

      // All dependency types (FS, SS, FF) shift the successor's finish by the
      // same propagated delay — the distinction affects start vs. finish anchor
      // but the magnitude of the date shift is identical.
      const dependencyType = successor.dependencyType ?? 'FS';
      let nextDelay = propagatedDelay;

      // FF does not compound delay; it only shifts finish-to-finish.
      // For a pure integer propagation model the delay value is unchanged.
      // FS and SS propagate the same integer delay.
      void dependencyType; // all three cases use nextDelay unchanged

      propagate(successorId, nextDelay);
    }
  }

  // Validate root activity exists
  console.log("Checking if activityMap has key:", String(activityId));
  console.log("ActivityMap keys:", Array.from(activityMap.keys()));
  if (!activityMap.has(activityId)) {
    throw new Error(`Activity not found: ${activityId}`);
  }

  propagate(activityId, delayDays);

  const totalProjectDelay = impactedActivities.length
    ? Math.max(...impactedActivities.map(a => a.propagatedDelay))
    : 0;

  return { impactedActivities, totalProjectDelay };
}

// ─── detectManpowerConflicts ──────────────────────────────────────────────────
// Finds pairs of activities within the given date window that have overlapping
// plannedStart/plannedFinish ranges.
//
// ScheduleActivity has no zoneId field; conflicts are grouped under the key
// 'unassigned' to satisfy the return shape while remaining schema-accurate.
//
// windowStart / windowEnd must be Date objects or ISO strings.
export async function detectManpowerConflicts(projectId, windowStart, windowEnd) {
  const pid = new mongoose.Types.ObjectId(projectId);
  const start = new Date(windowStart);
  const end = new Date(windowEnd);

  // Fetch activities whose planned range overlaps [windowStart, windowEnd]
  const activities = await ScheduleActivity.find({
    projectId: pid,
    plannedStart: { $lt: end },
    plannedFinish: { $gt: start },
  }).lean();

  if (activities.length < 2) return [];

  // Detect pairwise overlaps
  // zoneId is not in the ScheduleActivity schema; use 'unassigned' as group key.
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

      // ScheduleActivity has no zoneId — group all conflicts under 'unassigned'
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
      conflictingActivities: Array.from(activitySet),
    });
  }

  return result;
}
