/**
 * Tool executor — maps tool names from tools.js to concrete function calls
 * in the intelligence services.
 *
 * Contract:
 *   - args always contains projectId (injected by the controller, not the LLM)
 *   - Optional parameters are defaulted here when the LLM omits them
 *   - Every execution is wrapped in try/catch; failures return { success: false }
 *   - The full error is logged server-side but never exposed to the client
 */

import {
    getQuantityByElementType,
    getActivitiesByStatus,
    getActivitiesCompletingThisWeek,
    getOverdueActivities,
    getCostByPhase,
    getMonthlyIncidentCount,
    getElementMetadata,
    getCostAnomalies,
    rankContractorsByDelay,
    getZoneIssueDensity,
    predictZoneSafetyRisk,
} from '../intelligence/queryService.js';

import {
    simulateCascadingDelay,
    detectManpowerConflicts,
} from '../intelligence/simulationService.js';

const TOOL_MAP = {
    // ─── Schedule ──────────────────────────────────────────────────────────────
    get_overdue_activities: (args) =>
        getOverdueActivities(args.projectId),

    get_activities_this_week: (args) =>
        getActivitiesCompletingThisWeek(args.projectId),

    get_activities_by_status: (args) =>
        getActivitiesByStatus(args.projectId, args.status),

    // ─── Cost / Budget ─────────────────────────────────────────────────────────
    get_cost_by_phase: (args) =>
        getCostByPhase(args.projectId, args.phase),

    get_cost_anomalies: (args) => {
        const threshold = args.thresholdPercent ?? 10;
        return getCostAnomalies(args.projectId, threshold);
    },

    // ─── Safety / HSE ──────────────────────────────────────────────────────────
    get_monthly_incidents: (args) => {
        const now = new Date();
        const month = args.month ?? (now.getMonth() + 1);
        const year = args.year ?? now.getFullYear();
        return getMonthlyIncidentCount(args.projectId, month, year);
    },

    predict_zone_safety_risk: (args) =>
        predictZoneSafetyRisk(args.projectId),

    // ─── Simulations ───────────────────────────────────────────────────────────
    simulate_cascading_delay: (args) =>
        simulateCascadingDelay(args.projectId, args.activityId, args.delayDays),

    detect_manpower_conflicts: (args) => {
        const now = new Date();
        const windowStart = args.windowStart ?? now.toISOString();
        const fourWeeksAhead = new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000);
        const windowEnd = args.windowEnd ?? fourWeeksAhead.toISOString();
        return detectManpowerConflicts(args.projectId, windowStart, windowEnd);
    },

    // ─── BIM ───────────────────────────────────────────────────────────────────
    get_quantity_by_type: (args) =>
        getQuantityByElementType(args.projectId, args.elementType),

    // Note: getElementMetadata takes only bimGuid — no projectId
    get_element_metadata: (args) =>
        getElementMetadata(args.componentId),

    // ─── Contractors ───────────────────────────────────────────────────────────
    rank_contractors_by_delay: (args) =>
        rankContractorsByDelay(args.projectId),

    // ─── Zones / Issues ────────────────────────────────────────────────────────
    get_zone_issue_density: (args) =>
        getZoneIssueDensity(args.projectId),
};

export { TOOL_MAP };

/**
 * Executes a named tool with the provided arguments.
 *
 * @param {string} toolName  The tool name as returned by the LLM (must match TOOL_MAP key)
 * @param {object} args      Arguments from the LLM, augmented with projectId by the controller
 * @returns {Promise<{ success: boolean, data?: *, error?: boolean, message?: string }>}
 */
export async function executeTool(toolName, args) {
    const fn = TOOL_MAP[toolName];

    if (!fn) {
        return {
            success: false,
            error: true,
            message: `The tool '${toolName}' is not available. This query type may not be supported yet.`,
        };
    }

    try {
        const result = await fn(args);
        return {
            success: true,
            data: result,
        };
    } catch (err) {
        console.error(`Tool execution error [${toolName}]:`, err.message);
        return {
            success: false,
            error: true,
            message: 'Failed to retrieve data for this query. Please try again.',
        };
    }
}
