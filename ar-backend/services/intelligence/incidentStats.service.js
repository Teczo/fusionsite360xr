import mongoose from 'mongoose';
import HSE from '../../models/HSE.js';

// NOTE: The HSE schema has no 'zone' field.
// byZone is returned as [] and recentIncidents.zone as null.
// Schema is not modified per constraints.

export async function getIncidentStats(projectId) {
  const pid = new mongoose.Types.ObjectId(projectId);

  const [total, critical, warning, info, recent] = await Promise.all([
    HSE.countDocuments({ projectId: pid }),
    HSE.countDocuments({ projectId: pid, severity: 'Critical' }),
    HSE.countDocuments({ projectId: pid, severity: 'Warning' }),
    HSE.countDocuments({ projectId: pid, severity: 'Info' }),
    HSE.find({ projectId: pid })
      .sort({ date: -1 })
      .limit(5)
      .lean(),
  ]);

  const recentIncidents = recent.map(inc => ({
    id: String(inc._id),
    severity: inc.severity,
    zone: null, // No zone field in HSE schema
    date: inc.date ? new Date(inc.date).toISOString() : null,
  }));

  return {
    projectId: String(projectId),
    total,
    bySeverity: {
      Critical: critical,
      Warning: warning,
      Info: info,
    },
    byZone: [], // No zone field in HSE schema
    recentIncidents,
  };
}
