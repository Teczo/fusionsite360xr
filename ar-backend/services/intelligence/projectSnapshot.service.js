import mongoose from 'mongoose';
import ScheduleActivity from '../../models/ScheduleActivity.js';
import HSE from '../../models/HSE.js';
import Alert from '../../models/Alert.js';
import Media from '../../models/Media.js';
import SCurve from '../../models/SCurve.js';

export async function getProjectSnapshot(projectId) {
  const pid = new mongoose.Types.ObjectId(projectId);
  const today = new Date();

  const [activities, hseIncidents, alerts, mediaItems, sCurve] = await Promise.all([
    ScheduleActivity.find({ projectId: pid }).lean(),
    HSE.find({ projectId: pid }).lean(),
    Alert.find({ projectId: pid }).lean(),
    Media.find({ projectId: pid }).lean(),
    SCurve.findOne({ projectId: pid }).lean(),
  ]);

  // Derive schedule counts (no status field in schema)
  let completed = 0;
  let inProgress = 0;
  let overdue = 0;

  for (const act of activities) {
    if (act.actualFinish) {
      completed++;
    } else if (act.plannedFinish && act.plannedFinish < today) {
      overdue++;
    } else {
      inProgress++;
    }
  }

  // HSE severity counts
  let hseTotal = hseIncidents.length;
  let hseCritical = 0;
  let hseWarning = 0;
  let hseInfo = 0;
  for (const inc of hseIncidents) {
    if (inc.severity === 'Critical') hseCritical++;
    else if (inc.severity === 'Warning') hseWarning++;
    else if (inc.severity === 'Info') hseInfo++;
  }

  // Alert counts
  const alertTotal = alerts.length;
  const alertCritical = alerts.filter(a => a.severity === 'Critical').length;

  // Media counts
  const totalPhotos = mediaItems.filter(m => m.type === 'image').length;
  const totalVideos = mediaItems.filter(m => m.type === 'video').length;

  // S-Curve: baseline = planned, actual = actual
  let latestPlanned = 0;
  let latestActual = 0;

  if (sCurve) {
    const baseline = (sCurve.baseline || []).slice().sort((a, b) => new Date(a.date) - new Date(b.date));
    const actual = (sCurve.actual || []).slice().sort((a, b) => new Date(a.date) - new Date(b.date));

    if (baseline.length > 0) latestPlanned = baseline[baseline.length - 1].value;
    if (actual.length > 0) latestActual = actual[actual.length - 1].value;
  }

  return {
    projectId: String(projectId),
    schedule: {
      totalActivities: activities.length,
      completed,
      inProgress,
      overdue,
    },
    hse: {
      totalIncidents: hseTotal,
      critical: hseCritical,
      warning: hseWarning,
      info: hseInfo,
    },
    alerts: {
      totalAlerts: alertTotal,
      critical: alertCritical,
    },
    media: {
      totalPhotos,
      totalVideos,
    },
    sCurve: {
      latestPlanned,
      latestActual,
      variance: latestActual - latestPlanned,
    },
    lastUpdated: new Date().toISOString(),
  };
}
