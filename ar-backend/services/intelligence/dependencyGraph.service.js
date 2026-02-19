import mongoose from 'mongoose';
import ScheduleActivity from '../../models/ScheduleActivity.js';

export async function buildDependencyGraph(projectId) {
  const pid = new mongoose.Types.ObjectId(projectId);
  const activities = await ScheduleActivity.find({ projectId: pid }).lean();

  const nodes = activities.map(act => ({
    activityId: act.activityId || String(act._id),
    predecessors: act.predecessors || [],
    successors: act.successors || [],
    dependencyType: act.dependencyType || 'FS',
  }));

  const edges = [];
  for (const act of activities) {
    for (const predId of (act.predecessors || [])) {
      edges.push({
        from: predId,
        to: act.activityId || String(act._id),
        type: act.dependencyType || 'FS',
      });
    }
  }

  return {
    projectId: String(projectId),
    nodes,
    edges,
  };
}
