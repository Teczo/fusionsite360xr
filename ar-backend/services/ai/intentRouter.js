import {
  getOverdueActivities,
  getActivitiesCompletingThisWeek,
  getCostByPhase,
  getMonthlyIncidentCount,
} from '../intelligence/queryService.js';

import { simulateCascadingDelay } from '../intelligence/simulationService.js';

export async function routeIntent(projectId, question) {
  const q = question.toLowerCase();

  // 1. Overdue activities
  if (q.includes('overdue') || q.includes('past planned') || q.includes('late tasks')) {
    const result = await getOverdueActivities(projectId);
    return { intent: 'overdue_activities', result };
  }

  // 2. Activities completing this week
  if (q.includes('this week') || q.includes('scheduled this week')) {
    const result = await getActivitiesCompletingThisWeek(projectId);
    return { intent: 'activities_this_week', result };
  }

  // 3. Cost by phase
  if (q.includes('cost') || q.includes('budget') || q.includes('phase')) {
    const phaseMatch = question.match(/phase\s+(\d+)/i);
    const phase = phaseMatch ? `Phase ${phaseMatch[1]}` : 'Phase 1';
    const result = await getCostByPhase(projectId, phase);
    return { intent: 'cost_by_phase', result };
  }

  // 4. Cascading delay simulation
  if (q.includes('if') || q.includes('delay') || q.includes('impact')) {
    const idMatch = question.match(/([a-f0-9]{24})/i);
    const daysMatch = question.match(/(\d+)\s*days?/i);
    if (!idMatch) {
      throw new Error('A valid activity ObjectId (24 hex characters) is required for delay simulation.');
    }
    if (!daysMatch) {
      throw new Error('A delay duration in days (e.g. "5 days") is required for delay simulation.');
    }
    const activityId = idMatch[1];
    const delayDays = parseInt(daysMatch[1], 10);
    const result = await simulateCascadingDelay(projectId, activityId, delayDays);
    return { intent: 'cascading_delay', result };
  }

  // 5. Monthly safety incidents
  if (q.includes('incident') || q.includes('safety') || q.includes('this month')) {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const result = await getMonthlyIncidentCount(projectId, month, year);
    return { intent: 'monthly_incidents', result };
  }

  // Default — no intent matched
  return { intent: 'unknown', result: 'Unable to determine intent' };
}
