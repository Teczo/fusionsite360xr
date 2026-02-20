# AI-Readiness Compliance Audit — FusionXR 360 Backend

**Date:** 2026-02-20
**Codebase:** `ar-backend/`
**Basis:** Code evidence only. No assumptions made.

---

## PHASE 1 — DATA FOUNDATION HARDENING

### 1. Identifier Standardization

#### Collections audited against required fields:

| Field | Schedule (ScheduleActivity) | Cost | HSE | Issues | BIM Components | Contractor Performance | Projects |
|---|---|---|---|---|---|---|---|
| `projectId` | YES | ❌ MISSING COLLECTION | YES | ❌ MISSING COLLECTION | ❌ MISSING COLLECTION | ❌ MISSING COLLECTION | YES (is `_id`) |
| `activityId` | YES (not required) | ❌ | NO | ❌ | ❌ | ❌ | NO |
| `bimGuid` | NO | ❌ | NO | ❌ | ❌ | ❌ | NO |
| `zoneId` | NO | ❌ | NO | ❌ | ❌ | ❌ | NO |
| `contractorId` | NO | ❌ | NO | ❌ | ❌ | ❌ | NO |
| `phase` | NO | ❌ | NO | ❌ | ❌ | ❌ | NO |

**Critical finding:** Four of seven required collections do not exist:
- `Cost` — **NO MODEL FILE, NO SCHEMA, NO ROUTE, NO DATA**
- `Issues` — **NO MODEL FILE, NO SCHEMA, NO ROUTE, NO DATA**
- `BIM Components` — **NO MODEL FILE, NO SCHEMA, NO ROUTE, NO DATA**
- `Contractor Performance` — **NO MODEL FILE, NO SCHEMA, NO ROUTE, NO DATA**

**Naming consistency:**
- `activityId` is camelCase on ScheduleActivity — consistent within collection.
- `activityId` is NOT `required: true` (`activityId: String` — no required flag).
- `bimGuid`, `zoneId`, `contractorId`, `phase` do not appear in any model.

**Indexed:**
- `projectId` indexed on: ScheduleActivity ✅, HSE ✅, Timeline ✅, Alert ✅, Media ✅, ProjectDocument ✅
- `activityId` — NOT indexed anywhere.
- `bimGuid`, `zoneId`, `contractorId`, `phase` — not indexed (do not exist).

**⚠ MISMATCH WARNINGS:**
- `activityId` on `ScheduleActivity` is not `required`. Records can be inserted without it.
- `HSE.date` is the incident date — not named `incidentDate` as the plan requires.
- `ScheduleActivity.criticalPath` (Boolean) vs plan's expected `isCriticalPath`.
- `ScheduleActivity.weatherSensitivity` is `String`, not a numeric `weatherSensitivityScore`.
- `Projects._id` serves as the project identifier — no separate `projectId` field.

---

### 2. Status Vocabulary Normalization

**Required standard:** `Not Started`, `In Progress`, `Completed`, `Delayed`, `On Hold`

**Detected values:**

| Location | Field | Values |
|---|---|---|
| `Project.js` | `status` | `'Planning'`, `'Active'`, `'On Hold'`, `'Completed'` |
| `overdueActivities.service.js` | computed runtime | `'In Progress'`, `'Not Started'` |
| `User.js` (billing) | `billing.status` | free string — `active`, `trialing`, `past_due`, `canceled` |

- `'Planning'` ≠ `'Not Started'` — non-standard
- `'Active'` ≠ `'In Progress'` — non-standard
- `'Delayed'` absent from Project.status enum
- `ScheduleActivity` has **no `status` field** — status is derived at runtime, never persisted

| Check | Result |
|---|---|
| Standardized to plan vocabulary | **NO** |
| Needs cleanup | **YES** |

---

### 3. Index Audit

**HSE — required indexes:**

| Index Required | Present |
|---|---|
| `projectId` | YES (`index: true`) |
| `incidentDate` | NO — field named `date`; compound index is `{projectId:1, date:-1}` |
| `severity` | NO |
| `zone` | NO — field does not exist |

**ScheduleActivity — required indexes:**

| Index Required | Present |
|---|---|
| `projectId` | YES (`index: true`) |
| `activityId` | NO |
| `plannedFinish` | NO — compound index covers `plannedStart`, not `plannedFinish` |
| `actualFinish` | NO |
| `status` | NO — field does not exist |

**Cost:** MISSING COLLECTION ❌
**Issues:** MISSING COLLECTION ❌

**Compound indexes present:**
- `ScheduleActivity`: `{projectId:1, plannedStart:1}` — partially useful
- `HSE`: `{projectId:1, date:-1}` — partially useful (wrong field name in plan)
- `Timeline`, `Alert`, `Media`, `ProjectDocument`: adequate for their use cases

**Index Coverage Score: 15%**

---

### 4. Derived Fields Audit

**Schedule:**

| Field | Stored in Schema | Backfill Script | Pre-save Hook | Status |
|---|---|---|---|---|
| `delayDays` | YES (`default:0`) | YES | NO | **Precomputed** ✅ |
| `isDelayed` | YES (`default:false`) | YES | NO | **Precomputed** ✅ |
| `isCriticalPath` | PARTIAL — stored as `criticalPath:Boolean` | NO | NO | **Partial** ⚠ |

**Cost (missing collection):**

| Field | Status |
|---|---|
| `costVariance` | **MISSING** |
| `costVariancePercent` | **MISSING** |

**Contractor Performance (missing collection):**

| Field | Status |
|---|---|
| `avgDelayDays` | **MISSING** |
| `incidentRate` | **MISSING** |
| `reworkFrequency` | **MISSING** |

Pre-save hooks: None found in any model.
Aggregation pipelines for derived fields: None found.
Backfill script (`scripts/backfillDerivedFields.js`): Covers ScheduleActivity, SCurve variance, HSE severity weight.

---

### 5. Dependency Graph

**ScheduleActivity schema:**

| Field | Present |
|---|---|
| `predecessors` (array) | YES ✅ |
| `successors` (array) | YES ✅ (populated via bulkWrite during CSV import) |
| `dependencyType` (FS/SS/FF) | YES ✅ (enum enforced) |

| Capability | Present |
|---|---|
| Cascading delay simulation | **NO** — `dependencyGraph.service.js` only exports static nodes/edges |
| Topological traversal | **NO** — DFS cycle detection in `dataHealth.service.js` only |
| Recursion for delay propagation | **NO** |

| Check | Result |
|---|---|
| Dependency Graph Ready (data structure) | **PARTIAL** |
| Cascading Simulation Implemented | **NO** |

---

### 6. Historical Project Tagging

**Project schema:**

| Required Field | Present |
|---|---|
| `completed` (boolean) | **NO** — uses `status:'Completed'` string |
| `totalDelayPercent` | **NO** |
| `totalCostOverrunPercent` | **NO** |
| `majorRiskFactors` | **NO** |
| `incidentRate` | **NO** |

All 5 fields: **MISSING**

---

## PHASE 2 — DATA INTEGRITY VALIDATION

### 7. Data Health Endpoint

**Spec:** `GET /api/projects/:projectId/data-health`
**Found:** `GET /api/projects/:id/data-health` — `routes/intelligence.js:83` → `services/intelligence/dataHealth.service.js`

**Endpoint exists:** YES ✅

**Response shape vs spec:**

| Required Key | Returned |
|---|---|
| `scheduleReady` | YES — as `schedule.ready` (different nesting) |
| `costReady` | **NO** — Cost model absent |
| `hseReady` | YES — as `hse.ready` |
| `issueReady` | **NO** — Issues model absent |
| `historicalComparisonReady` | **NO** — not computed |
| `dependencyGraphReady` | YES — as `dependencies.ready` |

**Implemented: PARTIAL**

---

### 8. Referential Integrity Checks

| Check | Status |
|---|---|
| `cost.activityId` validated against schedule | NOT APPLICABLE — no Cost model |
| `issue.bimGuid` validated against BIM components | NOT APPLICABLE — no Issues or BIM Components |
| `hse.zone` validated against zones | NOT APPLICABLE — HSE has no zone field |
| Predecessor references validated | YES — `dataHealth.service.js` checks activityIdSet |

Middleware validation: None for cross-collection integrity.
Pre-save validation: None for cross-collection integrity.
Transactional checks: None.

**Integrity Enforcement Level: PARTIAL**

---

## PHASE 3 — STRUCTURED QUERY LAYER

| Function Required | Equivalent Found | Structured JSON | Used by Controller |
|---|---|---|---|
| `getOverdueActivities` | YES — exact name | YES | YES |
| `getIncidentCountByZone` | PARTIAL — `getIncidentStats` | YES — but `byZone:[]` hardcoded | YES |
| `getCostVarianceByPhase` | **NO** | — | — |
| `simulateCascadingDelay` | **NO** | — | — |

**LLM querying Mongo directly:** NO — No LLM integration exists anywhere in the backend.

**Deterministic Layer Complete: PARTIAL** (2 of 4 implemented; 1 broken by schema; 1 absent)

---

### 9. Rule-Based Risk Scoring

**Location:** `services/intelligence/activityRisk.service.js`

**Formula (weighted):**
- `isDelayed` → +40
- `criticalPath` → +30
- `hseProxy (project total > 3)` → +20 *(zone mapping impossible — no zone on HSE)*
- `alertCount` → +10 *(always 0 — Alert has no activityId)*

- Stored in schema: NO — computed on demand
- Used by controller: YES — `GET /api/projects/:id/intelligence/activity-risk`

**Risk Scoring Implemented: PARTIAL** — formula exists and executes; two of four factors permanently broken by schema gaps.

---

## PHASE 4 — AI LAYER

No LLM package found in `package.json`. `AiPage.jsx` explicitly says: *"AI integration coming soon. This feature will be powered by an LLM in a future phase."* All AI responses are hardcoded mocks.

| Check | Result |
|---|---|
| Intent detection mapping | **NO** |
| Tool routing logic | **NO** |
| Function calling usage | **NO** |
| System prompt guardrails | **NO** |
| Restrictions against raw DB queries by LLM | **NO** (no LLM) |
| LLM Direct DB Access | **NO** (safe by absence, not by design) |

**Intent Detection Layer: NO**
**Guardrails Implemented: NO**

---

## PHASE 5 — ADVANCED

### Historical Similarity

| Check | Result |
|---|---|
| Embeddings stored | **MISSING** |
| Vector DB integration | **MISSING** |
| Cosine similarity | **MISSING** |

### Weather Sensitivity

| Check | Result |
|---|---|
| `weatherSensitivityScore` (numeric) | **PARTIAL** — exists as `weatherSensitivity:String` (not numeric, not queryable for AI weighting) |
| Forecast integration | **MISSING** |

---

## FINAL OUTPUT

---

### 1. Executive Summary

| Phase | Description | % Complete |
|---|---|---|
| Phase 1 | Data Foundation Hardening | **17%** |
| Phase 2 | Data Integrity Validation | **25%** |
| Phase 3 | Structured Query Layer | **40%** |
| Phase 4 | AI Layer | **0%** |
| Phase 5 | Advanced | **5%** |

**Overall AI Readiness Score: 22 / 100**

Weighted: (17×0.30) + (25×0.20) + (40×0.25) + (0×0.20) + (5×0.05) ≈ **22%**

---

### 2. Completed Components

| Component | Evidence |
|---|---|
| `projectId` indexed on all supporting collections | HSE, Timeline, Alert, Media, ProjectDocument |
| `delayDays` and `isDelayed` stored on ScheduleActivity | Schema + backfill script |
| `predecessors`, `successors`, `dependencyType` on ScheduleActivity | Schema + bulkWrite in CSV import |
| Backfill script for derived fields | `scripts/backfillDerivedFields.js` |
| `data-health` endpoint exists and runs | `GET /api/projects/:id/data-health` |
| `getOverdueActivities` fully implemented | Service + controller + structured JSON |
| `getScheduleVariance` (S-Curve) fully implemented | Service + controller + trend |
| Risk scoring weighted formula exists | `activityRisk.service.js` |
| Dependency graph static export (nodes + edges) | `dependencyGraph.service.js` |
| DFS cycle detection | `dataHealth.service.js` |
| JWT auth + RBAC middleware | `authMiddleware.js`, `rbac.js` |
| `computedSeverityWeight` on HSE records | Schema + route |
| No LLM directly querying MongoDB | Confirmed by absence of any LLM SDK |

---

### 3. Partially Completed Components

| Component | Gap |
|---|---|
| `criticalPath` field | Named `criticalPath`, not `isCriticalPath` |
| `weatherSensitivity` field | Unstructured String; should be numeric score |
| Dependency graph | Data structure ready; cascading simulation absent |
| `getIncidentCountByZone` | `byZone` hardcoded to `[]` — HSE has no zone field |
| Risk scoring formula | Two of four factors broken (HSE zone, Alert activityId) |
| Data health endpoint | Wrong response shape; missing costReady, issueReady, historicalComparisonReady |
| Predecessor integrity check | Schedule-only; no cross-collection integrity |
| `activityId` on ScheduleActivity | Not required; can be null |
| Project status vocabulary | Non-standard values; missing `Delayed` |
| ScheduleActivity compound index | Covers `plannedStart` not `plannedFinish` |

---

### 4. Missing Components

| Component | Severity |
|---|---|
| Cost collection (model, schema, routes, data) | 🔴 CRITICAL |
| Issues collection | 🔴 CRITICAL |
| BIM Components collection | 🔴 CRITICAL |
| Contractor Performance collection | 🔴 CRITICAL |
| LLM / AI integration of any kind | 🔴 CRITICAL |
| Intent detection and tool routing | 🔴 CRITICAL |
| System prompt guardrails | 🔴 CRITICAL |
| `simulateCascadingDelay` function | 🔴 HIGH |
| `getCostVarianceByPhase` function | 🔴 HIGH |
| Historical project tagging fields (5 fields) | 🔴 HIGH |
| `zone` field on HSE | 🔴 HIGH |
| `bimGuid`, `zoneId`, `contractorId`, `phase` across collections | 🔴 HIGH |
| Embeddings / vector DB / cosine similarity | 🟠 MEDIUM |
| Weather forecast integration | 🟠 MEDIUM |
| Indexes on `activityId`, `plannedFinish`, `actualFinish`, `severity` | 🟠 MEDIUM |
| `activityId` on Alert model | 🟠 MEDIUM |
| `completed` boolean flag on Project | 🟡 LOW |

---

### 5. Critical Blockers

1. **Four entire collections are absent** (`Cost`, `Issues`, `BIM Components`, `Contractor Performance`). AI analysis of cost overruns, issues, BIM component status, and contractor performance is impossible. These are not schema gaps — the collections do not exist.

2. **No LLM integration exists.** The AI page is a UI mockup returning a hardcoded string. There is no backend AI route, no API key, no intent detection, no tool dispatch. Phase 4 is 0% implemented.

3. **HSE has no `zone` field.** `getIncidentCountByZone` returns `[]` permanently. Zone-based risk scoring is impossible. The `+20` HSE factor in risk scoring uses a broken project-level proxy.

4. **`activityId` is not required on ScheduleActivity.** Records without `activityId` fall back to `String(act._id)`, breaking all future cross-collection joins.

5. **No `phase` field exists on any collection.** Queries like "cost variance by phase" or "incidents in Phase 2" cannot be answered.

---

### 6. Recommended Next 5 Steps

**Step 1 — Create the four missing collections**
Define Mongoose schemas for `Cost`, `Issues`, `BIM Components`, and `Contractor Performance` with all required fields (`projectId`, `activityId`, `bimGuid`, `zoneId`, `contractorId`, `phase`). Add compound indexes. Without these, Phases 1–3 cannot advance.

**Step 2 — Add `zone` to HSE schema and `activityId` to Alert schema**
`zone: String` on HSE and `activityId: String` on Alert are required by three service functions and all four risk scoring factors. Add these fields and run a backfill. This unblocks `getIncidentCountByZone` and the complete risk scoring formula.

**Step 3 — Make `activityId` required; add missing indexes**
Set `activityId: { type: String, required: true }` on ScheduleActivity. Add indexes on `activityId`, `plannedFinish`, `actualFinish`, and HSE `severity`. This enables reliable AI cross-collection joins and efficient queries.

**Step 4 — Add historical tagging fields to Project schema**
Add `totalDelayPercent`, `totalCostOverrunPercent`, `majorRiskFactors`, `incidentRate` to `Project.js`. Populate via post-completion aggregation hook or script.

**Step 5 — Integrate LLM with deterministic tool routing**
Wire up an LLM (e.g., OpenAI function calling / Anthropic tool use) to the intelligence service layer. Create an intent-to-tool mapping that routes natural language queries to deterministic service functions. Enforce a system prompt guardrail that prevents the LLM from constructing raw MongoDB queries. This is the entirety of Phase 4.
