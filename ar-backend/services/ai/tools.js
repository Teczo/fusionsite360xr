/**
 * Universal tool definitions for FusionXR AI.
 *
 * These are provider-agnostic JSON Schema definitions. Each provider
 * (claudeProvider, openaiProvider, azureProvider) translates them into its
 * own native format at call time.
 *
 * IMPORTANT: projectId is intentionally absent from all parameter schemas.
 * It is injected by the controller before calling executeTool() and is never
 * requested from the LLM.
 *
 * Sources mapped:
 *   services/intelligence/queryService.js      — 11 functions
 *   services/intelligence/simulationService.js — 2 functions
 */

export const AI_TOOLS = [
    // ─── Schedule ──────────────────────────────────────────────────────────────

    {
        name: 'get_overdue_activities',
        description: `Returns all schedule activities that are overdue, delayed, behind schedule, running late, past their planned finish date, or slipping on the project. Use this when users ask: "Which tasks are overdue?", "What is delayed?", "Show me late activities", "What is behind schedule?", "What activities missed their deadline?", "What is not on track?", "Show me all delays". Returns activityId, delayDays, plannedFinish, and actualFinish for each overdue item.`,
        parameters: {
            type: 'object',
            properties: {},
            required: [],
        },
    },

    {
        name: 'get_activities_this_week',
        description: `Returns all schedule activities planned to complete during the current ISO week (Monday to Sunday). Use when users ask: "What is scheduled this week?", "What activities are completing soon?", "Show me this week's plan", "What is due this week?", "Upcoming completions", "Short-term schedule", "What should we finish this week?", "Weekly look-ahead". Returns the full list of activities with a plannedFinish date within the current week.`,
        parameters: {
            type: 'object',
            properties: {},
            required: [],
        },
    },

    {
        name: 'get_activities_by_status',
        description: `Returns schedule activities filtered by a specific status. Use when users ask about activities in a particular state: "Show me in-progress activities", "What tasks are completed?", "Which activities are on hold?", "List all not-started work", "What is pending?", "Show activities with a specific status". Common status values: "In Progress", "Completed", "Not Started", "Delayed", "On Hold".`,
        parameters: {
            type: 'object',
            properties: {
                status: {
                    type: 'string',
                    description: 'The activity status to filter by (e.g. "In Progress", "Completed", "Not Started", "Delayed", "On Hold").',
                },
            },
            required: ['status'],
        },
    },

    // ─── Cost / Budget ─────────────────────────────────────────────────────────

    {
        name: 'get_cost_by_phase',
        description: `Returns the cost breakdown — planned cost, actual cost, and variance percentage — for a named project phase. Use when users ask: "What is the cost for Phase 1?", "Show me budget versus actual spending", "How much have we spent on the foundation phase?", "Is Phase 2 over budget?", "Financial summary for a phase", "Planned versus actual costs", "Cost report". If no phase is specified, aggregates data across all phases.`,
        parameters: {
            type: 'object',
            properties: {
                phase: {
                    type: 'string',
                    description: 'The project phase name (e.g. "Phase 1", "Foundation", "MEP"). Omit to retrieve aggregated data across all phases.',
                },
            },
            required: [],
        },
    },

    {
        name: 'get_cost_anomalies',
        description: `Returns cost packages where actual spending exceeds the planned estimate by more than a threshold percentage. Use for overspend and budget variance alerts: "Which packages are over budget?", "Show cost overruns", "What is trending above estimate?", "Financial anomalies", "Budget alerts", "Which line items are in the red?", "Cost variance report". Results are sorted from highest variance to lowest. Defaults to a 10% variance threshold if not specified.`,
        parameters: {
            type: 'object',
            properties: {
                thresholdPercent: {
                    type: 'number',
                    description: 'Minimum cost variance percentage to flag as an anomaly (e.g. 10 for 10%). Defaults to 10 if not provided.',
                },
            },
            required: [],
        },
    },

    // ─── Safety / HSE ──────────────────────────────────────────────────────────

    {
        name: 'get_monthly_incidents',
        description: `Returns the total count of safety incidents (HSE events) recorded in a given month and year. Use when users ask: "How many incidents happened this month?", "What is our safety record?", "Show me HSE reports", "How many accidents in March?", "Incident count for the quarter", "Safety KPI", "Are we meeting safety targets?", "Total near-misses this year". Defaults to the current month and year if not specified.`,
        parameters: {
            type: 'object',
            properties: {
                month: {
                    type: 'number',
                    description: 'The month as a number (1 = January, 12 = December). Defaults to the current month if not provided.',
                },
                year: {
                    type: 'number',
                    description: 'The 4-digit year (e.g. 2025). Defaults to the current year if not provided.',
                },
            },
            required: [],
        },
    },

    {
        name: 'predict_zone_safety_risk',
        description: `Predicts safety risk scores by zone based on historical incident rates, ranking zones from highest predicted risk to lowest. Use for proactive safety management: "Which zones are most dangerous?", "Safety risk prediction", "Where should we focus safety inspections?", "High-risk area identification", "Predicted incident hotspots", "Safety forecast by zone", "Which areas need more attention?", "Risk assessment report".`,
        parameters: {
            type: 'object',
            properties: {},
            required: [],
        },
    },

    // ─── Simulations ───────────────────────────────────────────────────────────

    {
        name: 'simulate_cascading_delay',
        description: `Simulates the downstream impact if a specific schedule activity is delayed by a given number of days. Traverses the dependency graph to identify all successor activities affected and by how much (cascading / ripple effect). Use when users ask: "What happens if activity X is delayed by 5 days?", "Show the ripple effect of this delay", "What is the downstream impact?", "Cascading delay simulation", "Schedule impact analysis", "What activities are affected if this slips?". Requires the activity's MongoDB ObjectId (_id) — not the human-readable activityId string.`,
        parameters: {
            type: 'object',
            properties: {
                activityId: {
                    type: 'string',
                    description: 'The MongoDB ObjectId (_id) of the ScheduleActivity to delay. Must be a valid 24-character hex string (the document _id, not the human-readable activityId field).',
                },
                delayDays: {
                    type: 'number',
                    description: 'Number of days the activity is delayed (e.g. 5).',
                },
            },
            required: ['activityId', 'delayDays'],
        },
    },

    {
        name: 'detect_manpower_conflicts',
        description: `Detects overlapping manpower and resource conflicts within a date window — activities that compete for the same crews or site zones simultaneously. Use when users ask: "Are there any resource conflicts?", "Which activities have crew overlap?", "Show me manpower bottlenecks", "Site congestion analysis", "Staffing conflicts this month", "Which crews are double-booked?", "Resource availability issues", "Scheduling conflicts". Defaults to today through 4 weeks ahead if no window is specified.`,
        parameters: {
            type: 'object',
            properties: {
                windowStart: {
                    type: 'string',
                    description: 'ISO 8601 date string for the start of the analysis window (e.g. "2025-06-01"). Defaults to today if not provided.',
                },
                windowEnd: {
                    type: 'string',
                    description: 'ISO 8601 date string for the end of the analysis window (e.g. "2025-06-30"). Defaults to 4 weeks from today if not provided.',
                },
            },
            required: [],
        },
    },

    // ─── BIM ───────────────────────────────────────────────────────────────────

    {
        name: 'get_quantity_by_type',
        description: 'Count BIM elements by type/category. Use for questions about quantities of structural elements, equipment, pipes, etc. Supports categories like: Structural, Mechanical, Electrical, Piping, HVAC, Safety, Marine Structural. Also searches subcategories like: Jacket Foundation, Pump, Pressure Vessel, Compressor, Pipe, Crane, Helideck, Flare System, Module, Lifeboat, Subsea Tree, Riser.',
        parameters: {
            type: 'object',
            properties: {
                elementType: {
                    type: 'string',
                    description: 'The type/category to count. Examples: "Structural", "Pump", "Pipe", "column", "beam", "HVAC". Leave empty to get a full breakdown of all categories.',
                },
            },
        },
    },

    {
        name: 'get_element_metadata',
        description: 'Get detailed metadata for a specific BIM element including weight, dimensions, material, contractor, schedule dates, and discipline. Can search by element GUID, element name, or component ID. Use when the user asks about a specific piece of equipment, structural member, or component.',
        parameters: {
            type: 'object',
            properties: {
                componentId: {
                    type: 'string',
                    description: 'The element identifier — can be a GUID like {4e7f5g8d-...}, an element name like "fixed_platform_jacket", or a component ID like "PMP-P101".',
                },
            },
            required: ['componentId'],
        },
    },

    // ─── Contractors ───────────────────────────────────────────────────────────

    {
        name: 'rank_contractors_by_delay',
        description: `Ranks all subcontractors and vendors on the project by their average delay days, from worst performer to best. Use for contractor evaluation and accountability: "Who are the worst performing subcontractors?", "Which contractor has the most delays?", "Rank vendors by delay", "Subcontractor performance report", "Who is causing the most schedule slippage?", "Vendor delay ranking", "Contractor accountability metrics", "Which supplier is underperforming?".`,
        parameters: {
            type: 'object',
            properties: {},
            required: [],
        },
    },

    // ─── Zones / Issues ────────────────────────────────────────────────────────

    {
        name: 'get_zone_issue_density',
        description: `Returns issue counts grouped by zone, ranked from highest to lowest density. Identifies MEP coordination hotspots, clash zones, rework areas, and problem locations on the construction floor. Use when users ask: "Which zones have the most issues?", "Show me clash hotspots", "Where are the coordination problems?", "Zone issue heatmap", "Where is rework concentrated?", "MEP problem areas", "Which floor or zone has the most RFIs or issues?".`,
        parameters: {
            type: 'object',
            properties: {},
            required: [],
        },
    },

    // ─── Responsibility / Assignments ──────────────────────────────────────────

    {
        name: 'get_responsibility',
        description: `Find who is responsible for a specific discipline, system, trade, or component. Answers questions like: Who is responsible for HVAC? Who owns the electrical work? Which contractor handles piping? Who is assigned to Zone A? Responsibility lookups, assignment queries, subcontractor mapping.`,
        parameters: {
            type: 'object',
            properties: {
                discipline: {
                    type: 'string',
                    description: 'The discipline, trade, or system to look up. Examples: HVAC, Electrical, Structural, Piping, Fire Protection, Mechanical. Case-insensitive partial match.',
                },
            },
            required: [],
        },
    },

    // ─── Materials ─────────────────────────────────────────────────────────────

    {
        name: 'get_materials_by_level',
        description: `List materials used on a given level, floor, or area of the project. Answers questions like: What materials are used in Level 3? How much concrete is on the ground floor? Steel quantity per floor. Material breakdown, material takeoff, bill of materials by level.`,
        parameters: {
            type: 'object',
            properties: {
                level: {
                    type: 'string',
                    description: 'Level or floor identifier. Examples: Level 3, Ground Floor, Basement, Roof. If not specified, returns materials for all levels.',
                },
            },
            required: [],
        },
    },

    // ─── Document Search ───────────────────────────────────────────────────────

    {
        name: 'search_project_documents',
        description: `Search through project documents, inspection reports, drawings, submittals, and uploaded files. Answers questions like: Show me the inspection reports for foundation. Find the safety plan document. Any drawings for structural steel? Document retrieval, report lookup, file search.`,
        parameters: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Search keywords. Examples: foundation inspection, safety plan, structural drawings, commissioning report.',
                },
            },
            required: ['query'],
        },
    },

    // ─── Portfolio ─────────────────────────────────────────────────────────────

    {
        name: 'get_portfolio_overview',
        description: `Get a summary across ALL projects owned by the user. Portfolio-level analytics including total incidents, average delays, cost variance across projects. Answers questions like: Across all projects what is the average delay? Top factors for schedule overruns? How are my projects performing overall? Portfolio summary, cross-project comparison, executive overview.`,
        parameters: {
            type: 'object',
            properties: {},
            required: [],
        },
    },
];

export const AI_SYSTEM_PROMPT = `You are FusionXR AI, an intelligent assistant for construction and oil & gas project management. You help project managers, engineers, and executives query BIM data, schedules, costs, and safety records.

When a user asks a question, select the most appropriate tool to retrieve the relevant data. If the question does not match any available tool, respond with a brief explanation of what types of questions you can answer.

Important rules:
- Always select a tool when one is relevant, even if the match is not perfect.
- For cost questions without a specific phase mentioned, call get_cost_by_phase without the phase parameter to get all phases.
- For incident questions without a specific month, call get_monthly_incidents without month/year to get the current month.
- The projectId will be injected automatically — do not ask the user for it.`;
