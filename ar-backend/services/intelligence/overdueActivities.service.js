import mongoose from 'mongoose';
import ScheduleActivity from '../../models/ScheduleActivity.js';

export async function getOverdueActivities(projectId) {
  const pid = new mongoose.Types.ObjectId(projectId);
  const today = new Date();

  // Overdue: plannedFinish is in the past AND not yet finished
  const activities = await ScheduleActivity.find({
    projectId: pid,
    plannedFinish: { $lt: today },
    actualFinish: { $in: [null, undefined] },
  }).lean();

  const MS_PER_DAY = 1000 * 60 * 60 * 24;

  const result = activities.map(act => {
    const delayDays = act.plannedFinish
      ? Math.floor((today - new Date(act.plannedFinish)) / MS_PER_DAY)
      : 0;

    // Derive status: in progress if actualStart is set, otherwise not started
    const status = act.actualStart ? 'In Progress' : 'Not Started';

    return {
      activityId: act.activityId || String(act._id),
      name: act.name || '',
      plannedFinish: act.plannedFinish ? new Date(act.plannedFinish).toISOString() : null,
      actualFinish: act.actualFinish ? new Date(act.actualFinish).toISOString() : null,
      delayDays,
      status,
    };
  });

  return {
    projectId: String(projectId),
    count: result.length,
    activities: result,
  };
}
