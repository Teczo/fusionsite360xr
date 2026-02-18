import mongoose from 'mongoose';
import ScheduleActivity from '../../models/ScheduleActivity.js';
import HSE from '../../models/HSE.js';
import Alert from '../../models/Alert.js';

// Rule-based risk scoring (v1):
//   isDelayed            → +40
//   criticalPath         → +30
//   hseIncidentsInZone>3 → +20  (project-level proxy; HSE schema has no zone field,
//                                 so zone-to-activity mapping is impossible without
//                                 schema change. Applied at project level: total HSE > 3)
//   alertCountForActivity→ +10  (Alert schema has no activityId; factor always 0)

export async function getActivityRisk(projectId) {
  const pid = new mongoose.Types.ObjectId(projectId);
  const today = new Date();

  const [activities, hseCount] = await Promise.all([
    ScheduleActivity.find({ projectId: pid }).lean(),
    HSE.countDocuments({ projectId: pid }),
  ]);

  // hseIncidentsInZone > 3 proxy: project-wide HSE count > 3
  const hseRiskFires = hseCount > 3;

  const result = activities.map(act => {
    const isDelayed = !!(act.plannedFinish && act.plannedFinish < today && !act.actualFinish);
    const onCriticalPath = act.criticalPath === true;

    // Alert correlation is impossible without activityId on Alert model
    const alertCountForActivity = 0;

    let riskScore = 0;
    const factors = [];

    if (isDelayed) {
      riskScore += 40;
      factors.push('Delayed');
    }
    if (onCriticalPath) {
      riskScore += 30;
      factors.push('Critical Path');
    }
    if (hseRiskFires) {
      riskScore += 20;
      factors.push('High HSE Incidents');
    }
    if (alertCountForActivity > 2) {
      riskScore += 10;
      factors.push('High Alert Count');
    }

    return {
      activityId: act.activityId || String(act._id),
      name: act.name || '',
      riskScore,
      factors,
    };
  });

  // Sort descending by risk score for convenience
  result.sort((a, b) => b.riskScore - a.riskScore);

  return {
    projectId: String(projectId),
    activities: result,
  };
}
