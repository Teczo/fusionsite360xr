# FusionSite360XR — Technical Architecture Document

---

## 1. Project Overview

FusionSite360XR (marketed as **FusionXR**) is a construction project intelligence platform that combines BIM (Building Information Modeling) visualization, augmented reality scene authoring, and digital twin management for active construction sites.

**Target users:** Project managers, site engineers, and contractors working on construction projects who need to track schedule, safety (HSE), cost variance, and site media in a unified dashboard.

**High-level system purpose:**

- Author and publish 3D/AR scenes from BIM models (IFC, GLB), images, and interactive elements
- Provide a Digital Twin dashboard per project with live modules: Gantt timeline, HSE incident tracking, S-curve progress, alerts, media gallery, and document management
- Surface project intelligence via deterministic analytics queries explained by an LLM
- Gate features behind a Stripe subscription system
- Track viewer engagement via a custom analytics pipeline

---

## 2. System Architecture

```
Browser (React SPA + Three.js)
        │
        │ HTTPS (JWT Bearer)
        ▼
Express API Server (Node.js, port 4000)
        │
        ├──── MongoDB Atlas (Mongoose ODM)
        │
        ├──── Azure Blob Storage (file/media/document storage)
        │
        ├──── Stripe (subscription billing + webhooks)
        │
        └──── OpenAI API (GPT-4o-mini, explanation layer only)
```

**Data flow:**

1. The React SPA authenticates via `/api/signin`, stores a JWT in `localStorage`.
2. All protected API calls include the JWT as a `Bearer` token in the `Authorization` header.
3. The Express server validates the JWT via `authMiddleware`, then queries MongoDB.
4. File uploads (models, images, media, documents) are streamed to Azure Blob Storage via `@azure/storage-blob`; the returned blob URL is persisted in MongoDB.
5. When a user queries the AI assistant, the backend runs a deterministic keyword router against MongoDB, then forwards the structured result to GPT-4o-mini for a human-readable explanation.
6. Stripe webhooks (`/api/billing/webhook`) update subscription state on the User document.
7. Published AR scenes are publicly accessible without authentication via `/api/published/:id`.

---

## 3. Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, React Router 7, Vite 6, Tailwind CSS 4, Three.js 0.176, React Three Fiber 9, React Three XR 6, React Three Drei 10, Recharts 3, Leaflet, qrcode.react, react-hot-toast, lucide-react |
| **Backend** | Node.js ≥18, Express 5 (ESM), Multer, csv-parser, archiver, node-fetch |
| **Database** | MongoDB (Mongoose 8) |
| **Cloud** | Azure Web Apps (backend), Azure Blob Storage (`uploads` container), Render (frontend CDN) |
| **AI** | OpenAI SDK (`openai` v6), model `gpt-4o-mini` |
| **Authentication** | JWT (`jsonwebtoken`), bcrypt (`bcryptjs`) |
| **Storage** | Azure Blob Storage — all user-uploaded files, thumbnails, documents, media |
| **Billing** | Stripe (checkout sessions, customer portal, webhook lifecycle) |
| **DevOps** | GitHub Actions CI/CD (backend → Azure), PWA (vite-plugin-pwa + Workbox) |
| **3D / BIM** | Three.js, web-ifc (WASM), `@react-three/xr` (WebXR) |

---

## 4. Folder Structure Explanation

```
fusionsite360xr/
├── ar-backend/          # Express API server
├── holoxr-frontend/     # React SPA
├── .github/workflows/   # GitHub Actions CI/CD
├── PLAN.md              # Map/Weather card implementation plan (internal doc)
└── PWA-PLAN.md          # PWA conversion implementation plan (internal doc)
```

### `ar-backend/`

| Path | Purpose |
|---|---|
| `server.js` | Entry point: mounts middleware, registers all routes, connects to MongoDB/Azure |
| `routes/` | One file per feature domain; all route definitions |
| `controllers/` | Business logic extracted from routes (currently only `aiController.js`) |
| `controllers/dev/` | Dev-only debug controller; not loaded in production |
| `middleware/` | `authMiddleware.js` (JWT), `rbac.js` (role checks), `requireActiveSubscription.js` (billing gate) |
| `models/` | Mongoose schema definitions (one file per collection) |
| `services/` | Domain service layer split into `ai/` and `intelligence/` sub-packages |
| `services/ai/` | `intentRouter.js` (deterministic query routing) + `explanationService.js` (OpenAI call) |
| `services/intelligence/` | Analytical services: snapshot, overdue, incidents, schedule variance, activity risk, dependency graph, data health, simulation, portfolio, query helpers |
| `lib/` | Shared singletons (Stripe client) |
| `utils/` | Standalone utilities: thumbnail generation (Puppeteer + Three.js), project plan helpers, authorization guards |
| `scripts/` | One-off maintenance scripts: `seed.js` (test data), `backfillDerivedFields.js` (schema migration) |

### `holoxr-frontend/`

| Path | Purpose |
|---|---|
| `src/main.jsx` | App entry point; mounts `BrowserRouter`, registers service worker |
| `src/App.jsx` | Route definitions, `RequireAuth` guard, global `Toaster` |
| `src/layouts/AppLayout.jsx` | Shared authenticated layout: collapsible sidebar + top bar + `<Outlet>` |
| `src/pages/` | Top-level page components (one per route) |
| `src/components/` | Reusable component tree (see below) |
| `src/components/Studio/` | 3D scene editor (drag/drop, transform gizmos, property panels) |
| `src/components/viewer/` | Public AR viewers (marker-based, plane-based, image-tracking) |
| `src/components/ProjectModules/` | Per-project modules: Timeline, HSE, Alerts, SCurve, Media, Documents |
| `src/components/DashboardWidgets/` | Aggregate dashboard widgets (TimelineWidget, HSEWidget, SCurveWidget, etc.) |
| `src/components/dashboard/` | Sidebar, DashboardHeader, DashboardPanel, per-project cards (Map, Weather, Location) |
| `src/components/panels/` | Studio side panels: Layers, Property, FloatingPanel, TopBar |
| `src/components/analytics/` | Analytics dashboard pages (Overview, Audience, Engagement, Projects, Reports) |
| `src/components/billing/` | Billing UI: pricing table, current plan banner |
| `src/components/team/` | Team management UI (share project modal, team panel) |
| `src/components/hooks/` | Custom hooks: `useRole`, `useSidebarState`, `useAnalytics`, `useUserPlan` |
| `src/components/modals/` | LibraryModal, QRCodeModal, LoadingScreen, SketchfabPanel |
| `src/components/ui/` | Generic UI primitives: Badge, Card, ChartContainer, EmptyState, LoadingSpinner |
| `src/components/Items/` | 3D scene item renderers: GLBModel, ImagePlane, TextItem, Quiz3D, UIButton3D, UILabel3D |
| `src/services/api.js` | Centralized fetch wrapper + typed API modules for all backend resources |
| `src/three/ifc/` | IFC loader manager (web-ifc WASM integration) |
| `src/utils/` | `pwa.js` (install prompt hook), `ifcLoader.js` |
| `src/shims/` | `BufferGeometryUtils.js` — compatibility shim aliased via Vite resolver |
| `public/ifc/` | IFC WASM runtime assets (`web-ifc.wasm`, `web-ifc-mt.wasm`) |

---

## 5. Backend Architecture

### Server Entry Point

`ar-backend/server.js` — Express 5, ESM modules, `node server.js` start command.

### Middleware Stack (in order)

1. **CORS** — allowlist-based, reads `CORS_ORIGINS` env var; defaults include localhost + Azure + Render origins. Preflight handled via `app.options(/.*/)`.
2. **Stripe webhook raw body** — `/api/billing` is mounted before body parsers so Stripe signature verification receives the raw buffer.
3. **`express.json()`** — JSON body parsing for all other routes.
4. **`express.text({ type: 'text/plain' })`** — plaintext body support (analytics beacon).
5. **Routes** — mounted under `/api` prefix (see §7).
6. **Global error handler** — last middleware; catches `next(err)`, CORS rejections, and thrown errors; returns `{ error: message }` JSON.

### Route Organization

Routes are organized by domain, each in a dedicated file under `ar-backend/routes/`. All routes are mounted on the `/api` prefix in `server.js`. Dev-only routes (`/api/dev/intelligence`) are conditionally mounted when `NODE_ENV !== 'production'`.

### Controllers / Services Structure

- **Thin routes, thin controllers:** Most routes contain their own handler logic inline.
- **`aiController.js`:** Single exported async function that orchestrates intent routing + LLM explanation.
- **`services/intelligence/`:** A set of pure async functions, each querying MongoDB and returning structured data. Called by both the intelligence REST routes and the AI query pipeline.

### Error Handling

- Route-level: `try/catch` blocks calling `res.status(N).json({ error: ... })`.
- Validation errors from Mongoose (`err.name === 'ValidationError'` / `'CastError'`) return 400.
- Global fallback middleware catches any error that escapes route handlers.

### Validation Approach

- Input validation is done inline in route handlers (required field checks, `mongoose.Types.ObjectId.isValid()`).
- Mongoose schema validators enforce enum values, required fields, and array constraints.
- No external validation library (e.g., Zod, Joi) is used.

### Authentication & Authorization Logic

| Layer | Mechanism |
|---|---|
| **Authentication** | JWT signed with `JWT_SECRET`, 7-day expiry. `authMiddleware` extracts `userId` from token and attaches it to `req.userId`. |
| **Role enforcement** | `requireRole(...allowedRoles)` middleware queries the User document for its `role` field (admin/engineer/contractor). Defaults to `admin` for legacy documents without a role. |
| **Subscription gate** | `requireActiveSubscription` checks `user.billing.status` is `active` or `trialing`. Allows access if subscription is set to cancel but the period hasn't ended. Returns 402 otherwise. |
| **Resource ownership** | Route handlers call `Project.findOne({ _id: id, userId: req.userId })` to ensure users can only access their own projects. |

---

## 6. Data Models

### User

| Field | Type | Notes |
|---|---|---|
| `name` | String | Required |
| `email` | String | Required, unique |
| `passwordHash` | String | bcrypt hash, required |
| `role` | String | Enum: `admin`, `engineer`, `contractor`. Default: `admin` |
| `profile` | Object | Embedded: username, about, avatarUrl, coverUrl, firstName, lastName, address, notifications |
| `billing` | Object | Embedded: stripeCustomerId, stripeSubscriptionId, priceId, planKey, status, currentPeriodEnd, cancelAtPeriodEnd |
| `createdAt`, `updatedAt` | Date | Mongoose timestamps |

### Project

| Field | Type | Notes |
|---|---|---|
| `userId` | ObjectId → User | Owner reference, required |
| `name` | String | Required |
| `description` | String | |
| `startDate`, `endDate` | Date | |
| `status` | String | Enum: `Not Started`, `In Progress`, `Completed`, `Delayed`, `On Hold`. Pre-save migration normalizes legacy values. |
| `tags` | [String] | |
| `projectCode` | String | |
| `teamMembers` | [ObjectId → User] | |
| `location` | Object | `{ address, latitude, longitude }` |
| `thumbnail` | String | Azure blob URL |
| `scene` | [Mixed] | Live 3D scene object array |
| `published` | Boolean | Default: false |
| `publishedAt` | Date | |
| `publishedScene` | [Mixed] | Snapshot of scene at publish time |
| `trashed` | Boolean | Soft-delete flag |

### File

| Field | Type | Notes |
|---|---|---|
| `name` | String | |
| `type` | String | `model`, `image`, or `ifc` |
| `url` | String | Azure blob URL |
| `thumbnail` | String | Azure blob URL |
| `size`, `mimeType` | Number/String | |
| `uploadedAt` | Date | |
| `folder` | ObjectId → Folder | Nullable |
| `trashed` | Boolean | |
| `position`, `rotation`, `scale` | Object `{ x, y, z }` | 3D transform defaults |

### Folder

| Field | Type | Notes |
|---|---|---|
| `name` | String | Required |
| `parent` | ObjectId → Folder | Nullable; enables tree hierarchy |
| `trashed` | Boolean | |

### HSE

| Field | Type | Notes |
|---|---|---|
| `projectId` | ObjectId → Project | Required, indexed |
| `title` | String | Required |
| `description` | String | |
| `severity` | String | Enum: `Critical`, `Warning`, `Info` |
| `date` | Date | Required |
| `incidentDate` | Date | Distinct queryable incident date |
| `zoneId` | String | Required (default `''` for legacy docs) |
| `source` | String | Enum: `manual`, `csv-import` |
| `importedFromDocumentId` | ObjectId → ProjectDocument | |
| `createdBy` | ObjectId → User | |
| `computedSeverityWeight` | Number | Derived: Critical=3, Warning=2, Info=1 |

Compound indexes: `(projectId, date)`, `(projectId, incidentDate)`, `(projectId, zoneId)`, `severity`.

### Timeline

| Field | Type | Notes |
|---|---|---|
| `projectId` | ObjectId → Project | Required, indexed |
| `title` | String | Required |
| `description` | String | |
| `date` | Date | Required |
| `type` | String | Enum: `milestone`, `incident`, `progress_update` |
| `createdBy` | ObjectId → User | |

Index: `(projectId, date)` descending.

### Alert

| Field | Type | Notes |
|---|---|---|
| `projectId` | ObjectId → Project | Required, indexed |
| `title` | String | Required |
| `severity` | String | Enum: `Critical`, `Warning`, `Info` |
| `activityId` | String | Required (default `''` for legacy) |
| `source` | String | Enum: `manual`, `iot` |
| `date` | Date | Required |
| `createdBy` | ObjectId → User | |

### SCurve

| Field | Type | Notes |
|---|---|---|
| `projectId` | ObjectId → Project | Required, **unique** (one S-curve per project) |
| `baseline` | [{ date, value }] | Planned progress curve data points |
| `actual` | [{ date, value }] | Actual progress curve data points |
| `updatedBy` | ObjectId → User | |
| `variance`, `variancePercent` | Number | Stored derived fields |

### ScheduleActivity

| Field | Type | Notes |
|---|---|---|
| `projectId` | ObjectId → Project | Required, indexed |
| `activityId` | String | Required (default `''` for legacy) |
| `name` | String | |
| `status` | String | Enum: Not Started / In Progress / Completed / Delayed / On Hold |
| `plannedStart`, `plannedFinish` | Date | |
| `actualStart`, `actualFinish` | Date | |
| `durationDays`, `plannedDurationDays` | Number | |
| `delayDays` | Number | Derived in `pre('save')` |
| `isDelayed` | Boolean | Derived in `pre('save')` |
| `criticalPath` | Boolean | |
| `weatherSensitivity` | String | |
| `predecessors`, `successors` | [String] | activityId references; successors backfilled on CSV import |
| `dependencyType` | String | Enum: `FS`, `SS`, `FF`. Default: `FS` |

Indexes: `(projectId, plannedStart)`, `(projectId, activityId)`, `(projectId, plannedFinish)`, `status`.

### Media

| Field | Type | Notes |
|---|---|---|
| `projectId` | ObjectId → Project | Required, indexed |
| `url` | String | Azure blob URL, required |
| `thumbnail` | String | Azure blob URL |
| `name` | String | |
| `type` | String | Enum: `image`, `video` |
| `size`, `mimeType` | Number/String | |
| `uploadedBy` | ObjectId → User | |

### ProjectDocument

| Field | Type | Notes |
|---|---|---|
| `projectId` | ObjectId → Project | Required, indexed |
| `fileName` | String | Required |
| `documentCategory` | String | e.g., `ai-dataset`, `schedule` |
| `datasetType` | String | e.g., `hse`, `schedule` |
| `fileType` | String | Required: `pdf`, `csv`, `docx`, etc. |
| `fileSize` | Number | Bytes, required |
| `blobUrl` | String | Azure blob URL, required |
| `uploadedBy` | ObjectId → User | |
| `version` | Number | Default: 1 |

### Animation

| Field | Type | Notes |
|---|---|---|
| `projectId` | ObjectId → Project | Required |
| `objectId` | String | Scene item ID, required |
| `enabled` | Boolean | |
| `behaviors` | [Mixed] | Array of behavior objects |
| `version` | Number | |

Unique index: `(projectId, objectId)`. Each behavior has a `type` field: `rotateSelf`, `orbit`, or `translatePath`, with type-specific parameters. Axis vectors are normalized in a `pre('validate')` hook.

### BIMComponent

| Field | Type | Notes |
|---|---|---|
| `projectId` | ObjectId → Project | Required |
| `zoneId` | String | Required |
| `componentId` | String | BIM GUID |
| `name`, `type` | String | |
| `status` | String | Enum: standard status values |
| `properties` | Mixed | Freeform BIM properties |

### ContractorPerformance

| Field | Type | Notes |
|---|---|---|
| `projectId` | ObjectId → Project | Required |
| `contractorName` | String | |
| `totalActivities`, `delayedActivities`, `totalDelayDays`, `incidents`, `reworkCount` | Number | Input fields |
| `avgDelayDays`, `incidentRate`, `reworkFrequency` | Number | Derived in `pre('save')` |

### Cost

| Field | Type | Notes |
|---|---|---|
| `projectId` | ObjectId → Project | Required |
| `phase` | String | |
| `description` | String | |
| `plannedCost`, `actualCost` | Number | Required |
| `costVariance`, `costVariancePercent` | Number | Derived in `pre('save')` |
| `status` | String | Enum: standard status values |
| `createdBy` | ObjectId → User | |

Indexes: `(projectId, phase)`, `costVariancePercent`.

### Issue

| Field | Type | Notes |
|---|---|---|
| `projectId` | ObjectId → Project | Required |
| `zoneId` | String | Required |
| `title` | String | Required |
| `description` | String | |
| `severity` | String | Enum: `Critical`, `Warning`, `Info` |
| `status` | String | Enum: standard status values |
| `resolvedAt` | Date | |
| `createdBy` | ObjectId → User | |

### AnalyticsEvent

| Field | Type | Notes |
|---|---|---|
| `ts` | Date | Required, indexed |
| `event` | String | Required, indexed |
| `projectId` | String | Indexed |
| `sessionId` | String | Indexed |
| `ua`, `platform`, `lang`, `ref` | String | User-agent metadata |
| `payload` | Mixed | Full raw body |

Schema is `strict: false` to capture arbitrary additional fields.

---

## 7. API Endpoints

### Authentication

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/api/signup` | No | Register new user with name, email, password |
| POST | `/api/signin` | No | Authenticate; returns JWT + user object |
| GET | `/api/me` | Yes | Return current user (no passwordHash) |

### Projects

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | `/api/projects` | Yes | List all non-trashed projects for authenticated user |
| POST | `/api/projects` | Yes | Create project. Body: `{ name, description, startDate, endDate, status, tags, projectCode, teamMembers, location }` |
| GET | `/api/projects/trashed` | Yes | List trashed projects |
| GET | `/api/projects/shared` | Yes | List projects shared with authenticated user |
| GET | `/api/projects/:id` | Yes | Get single project by owner check |
| PUT | `/api/projects/:id` | Yes | Update project 3D scene. Body: `{ scene }` |
| PUT | `/api/projects/:id/publish` | Yes | Publish scene snapshot. Body: `{ scene }` |
| PATCH | `/api/projects/:id/thumbnail` | Yes | Upload project thumbnail image (multipart) |
| DELETE | `/api/projects/:id` | Yes | Soft-delete (sets `trashed: true`) |
| PATCH | `/api/projects/:id/restore` | Yes | Restore from trash |
| DELETE | `/api/projects/:id/permanent` | Yes | Hard delete |
| GET | `/api/published/:id` | No | Get full published scene (public AR) |
| GET | `/api/published-model/:id` | No | Get first GLB model from published scene |

### Timeline

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | `/api/projects/:id/timeline` | Yes | List timeline entries sorted by date desc |
| POST | `/api/projects/:id/timeline` | Yes | Create entry. Body: `{ title, description, date, type }` |
| PUT | `/api/projects/:id/timeline/:timelineId` | Yes | Update entry |
| DELETE | `/api/projects/:id/timeline/:timelineId` | Yes | Delete entry |

### HSE

| Method | Route | Auth | Role | Purpose |
|---|---|---|---|---|
| GET | `/api/projects/:id/hse` | Yes | Any | List incidents sorted by date desc |
| POST | `/api/projects/:id/hse` | Yes | admin | Create incident manually |
| PUT | `/api/projects/:id/hse/:hseId` | Yes | admin | Update incident |
| DELETE | `/api/projects/:id/hse/:hseId` | Yes | admin | Delete incident |
| POST | `/api/projects/:id/hse/import` | Yes | Any | CSV bulk import; uploads file to Azure, parses, inserts |

### Alerts

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | `/api/projects/:id/alerts` | Yes | List alerts |
| POST | `/api/projects/:id/alerts` | Yes | Create alert. Body: `{ title, severity, activityId, date, source }` |
| PUT | `/api/projects/:id/alerts/:alertId` | Yes | Update alert |
| DELETE | `/api/projects/:id/alerts/:alertId` | Yes | Delete alert |

### S-Curve

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | `/api/projects/:id/s-curve` | Yes | Get S-curve data (baseline + actual arrays) |
| PUT | `/api/projects/:id/s-curve` | Yes | Upsert S-curve. Body: `{ baseline: [{date, value}], actual: [{date, value}] }` |

### Media

| Method | Route | Auth | Role | Purpose |
|---|---|---|---|---|
| GET | `/api/projects/:id/media` | Yes | Any | List media files |
| POST | `/api/projects/:id/media` | Yes | admin, contractor | Upload image/video to Azure (multipart) |
| DELETE | `/api/projects/:id/media/:mediaId` | Yes | admin | Delete media record |

### Documents

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | `/api/projects/:id/documents` | Yes | List project documents |
| POST | `/api/projects/:id/documents` | Yes | Upload document to Azure (multipart) |
| DELETE | `/api/projects/:id/documents/:documentId` | Yes | Delete document record |

### Schedule

| Method | Route | Auth | Role | Purpose |
|---|---|---|---|---|
| POST | `/api/projects/:projectId/schedule/upload` | Yes | admin | CSV upload; replaces full schedule. Required columns: `activity_id`, `activity_name`, `planned_start`, `planned_finish` |
| GET | `/api/projects/:projectId/schedule` | Yes | Any | List activities sorted by plannedStart |

### Project Intelligence

All endpoints require authentication.

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/projects/:id/intelligence/snapshot` | Aggregate project health: schedule counts, HSE severity breakdown, alert counts, media counts, S-curve variance |
| GET | `/api/projects/:id/intelligence/overdue` | List activities where `isDelayed: true` |
| GET | `/api/projects/:id/intelligence/incidents` | HSE incident statistics |
| GET | `/api/projects/:id/intelligence/schedule-variance` | Schedule variance computation |
| GET | `/api/projects/:id/intelligence/activity-risk` | Per-activity risk scoring |
| GET | `/api/projects/:id/intelligence/dependency-graph` | Predecessor/successor adjacency graph |
| GET | `/api/projects/:id/data-health` | Data quality audit (missing dates, invalid predecessors, cycle detection, severity weight mismatches) |

### AI Query

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/api/ai/query` | No (no authMiddleware in router) | Natural language query. Body: `{ projectId, question }`. Returns `{ intent, data, explanation }` |

### Analytics

No authentication required on any analytics endpoint.

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/analytics/track` | Ingest analytics event. Body: `{ ts, event, projectId, sessionId, ua, platform, lang, ref, ...payload }` |
| GET | `/api/analytics/overview?range=N` | Aggregate totals: events, unique sessions, active projects, daily time-series |
| GET | `/api/analytics/audience?range=N&projectId=X` | Platform and language breakdown |
| GET | `/api/analytics/projects/:projectId?range=N` | Per-project: views, retention curve, object taps, event breakdown, daily series |
| GET | `/api/analytics/engagement/:projectId?range=N` | Button clicks and quiz event counts |

### Profile

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | `/api/profile` | Yes | Get current user profile (no passwordHash) |
| PATCH | `/api/profile` | Yes | Update profile fields. Body: `{ name, email, profile: { username, about, avatarUrl, ... } }` |

### Team

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | `/api/team` | Yes | Return team members (currently returns only owner) |
| POST | `/api/team/invite` | Yes | Invite by email (stub — returns pending record) |
| PATCH | `/api/team/:memberId` | Yes | Update member role (stub) |
| DELETE | `/api/team/:memberId` | Yes | Remove member (stub) |
| GET | `/api/team/search?q=` | Yes | Search users (stub — returns empty) |

### Billing

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/api/billing/create-checkout-session` | Yes | Create Stripe checkout session. Body: `{ planKey: 'SINGLE' \| 'FOUNDING' }` |
| POST | `/api/billing/create-portal-session` | Yes | Create Stripe customer portal session |
| GET | `/api/billing/status` | Yes | Return current user billing object |
| GET | `/api/billing/confirm?session_id=X` | No | Confirm checkout and sync subscription to user |
| POST | `/api/billing/webhook` | No (Stripe sig) | Process Stripe events: checkout completed, subscription created/updated/deleted |

### Animations

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/api/animations` | Yes | Upsert animation behaviors for a scene object. Empty behaviors array deletes the document. |
| GET | `/api/animations/:projectId/:objectId` | Yes | Get animation for specific object |
| GET | `/api/animations/:projectId` | Yes | Get all animations for project |
| DELETE | `/api/animations/:projectId/:objectId` | Yes | Delete animation |

### Files (Asset Library)

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | `/api/files?folder=X` | No | List non-trashed files, optionally filtered by folder |
| POST | `/api/upload` | No | Upload file + optional thumbnail to Azure. Fields: `file`, `thumbnail` |

---

## 8. Frontend Architecture

### Routing System

React Router 7 with a `BrowserRouter`. Routes are defined in `src/App.jsx`.

- **Public routes:** `/signup`, `/signin`, `/ar-select/:id`, `/ar/:id`, `/ar-plane/:id`, `/ar-image/:id`
- **Protected routes:** wrapped in a `RequireAuth` component that checks `localStorage.getItem('token')`; redirects to `/signin` if absent
- **Authenticated layout:** Protected routes (except `/studio`) render inside `AppLayout` which provides a collapsible sidebar and top bar
- **Catch-all:** `*` redirects to `/signin`

### State Management

No global state library (no Redux, Zustand, etc.). State is managed via:
- `useState` / `useEffect` per component
- `useOutletContext()` for layout-to-page communication (search query, modal state, user object)
- `RoleProvider` context (`src/components/hooks/useRole.jsx`) exposes authenticated user role
- JWT stored in `localStorage`; included manually in every API request

### Component Structure

```
AppLayout (sidebar + topbar shell)
└── <Outlet> (page content)
    ├── DashboardPage      — project grid + aggregate widgets
    ├── DigitalTwinDashboard — per-project: BIM viewer + all modules
    ├── TwinPage           — full-viewport 3D scene preview
    ├── TimelinePage       — standalone Gantt timeline
    ├── HsePage            — HSE incident management
    ├── FilesPage          — 3D asset library (grid/list view)
    ├── AiPage             — AI query assistant UI
    ├── StudioPage         — 3D scene editor (full-screen, no AppLayout)
    └── ARViewer / ARPlane / ARImageTracker / ARMarkerViewer — public XR viewers
```

### Major UI Modules

- **Studio (`src/components/Studio/`):** A full-screen scene editor where users place 3D models, images, text, buttons, quiz objects, and 3D labels. Objects are draggable with transform gizmos. Properties are edited in a side panel. Scene state is saved to the backend via `PUT /api/projects/:id`.
- **Digital Twin Dashboard (`src/pages/DigitalTwinDashboard.jsx`):** Per-project view with tabs/sections: 3D scene preview (`ScenePreviewCanvas`), Timeline, HSE, Alerts, S-Curve chart, Media gallery, Documents, Map card, Weather card.
- **AR Viewers:** Multiple viewer modes for published scenes — marker-based (A-Frame style), WebXR plane placement, image tracking. Accessible at public URLs without authentication.

### 3D / Rendering Logic

- **React Three Fiber** (`@react-three/fiber`) as the Three.js React renderer.
- **React Three XR** (`@react-three/xr`) for WebXR AR sessions.
- **React Three Drei** for helpers (GLTF loader, OrbitControls, etc.).
- **IFC loading:** `web-ifc` WASM + a custom `ifcLoaderManager.js` that handles the WASM runtime. WASM files are copied to `public/ifc/` at build time via a custom Vite plugin (`ifcAssetsPlugin`).
- **Scene items:** Each scene object type has a dedicated Three.js component in `src/components/Items/`.
- **Post-processing:** `@react-three/postprocessing` + `postprocessing` used for visual effects; a dev panel (`DoFDevPanel`) allows depth-of-field tuning.
- **Animations:** Behaviors stored in MongoDB are replayed in the Three.js render loop in the viewer.

### Data Fetching

All API calls go through `src/services/api.js`, which provides a thin `fetch` wrapper and typed modules (`timelineApi`, `hseApi`, `alertsApi`, `scurveApi`, `mediaApi`, `documentsApi`, `scheduleApi`, `userApi`). The JWT is always read from `localStorage` at call time. Errors throw `Error(data.error)`.

### Environment Config

| Variable | Used In | Purpose |
|---|---|---|
| `VITE_API_URL` | `src/services/api.js`, inline fetches | Base URL for all backend API calls |
| `VITE_DOF_DEVTOOLS` | DoF dev panel | Toggle depth-of-field tuning panel |

---

## 9. AI Integration

### Architecture

The AI system uses a two-layer architecture: a **deterministic query router** followed by an **LLM explanation layer**.

```
User question (natural language)
        │
        ▼
intentRouter.js  ←── keyword matching
        │
        ├── getOverdueActivities()
        ├── getActivitiesCompletingThisWeek()
        ├── getCostByPhase()
        ├── simulateCascadingDelay()
        └── getMonthlyIncidentCount()
        │
        ▼ structured JSON result
explanationService.js  ←── OpenAI GPT-4o-mini
        │
        ▼ human-readable explanation
API response: { intent, data, explanation }
```

### Intent Router (`services/ai/intentRouter.js`)

Keyword-based deterministic routing. Intents:

| Intent | Trigger Keywords | Data Source |
|---|---|---|
| `overdue_activities` | `overdue`, `past planned`, `late tasks` | `ScheduleActivity.isDelayed: true` |
| `activities_this_week` | `this week`, `scheduled this week` | `ScheduleActivity.plannedFinish` in current ISO week |
| `cost_by_phase` | `cost`, `budget`, `phase` | `Cost` aggregation by phase |
| `cascading_delay` | `if`, `delay`, `impact` | `simulateCascadingDelay()` — BFS over successor graph |
| `monthly_incidents` | `incident`, `safety`, `this month` | `HSE.countDocuments` by month/year |
| `unknown` | (no match) | Returns string `'Unable to determine intent'` |

### Explanation Service (`services/ai/explanationService.js`)

- **Model:** `gpt-4o-mini`
- **Temperature:** `0` (deterministic output)
- **System prompt:** Instructs the model to only explain the structured data, never invent values, and state clearly when records are empty.
- **Fallback:** On HTTP 429 (rate limit), returns `null`; the API response includes `explanation: null` and the frontend receives raw structured data only.
- **No streaming.** Single synchronous completion call.

---

## 10. Storage & File Management

### Storage Backend

All files are stored in **Azure Blob Storage**, container name: `uploads`.

### Upload Flow

1. Client sends `multipart/form-data` to the backend.
2. Multer buffers the file in memory (`multer.memoryStorage()`).
3. Backend creates a `BlobServiceClient` from `AZURE_STORAGE_CONNECTION_STRING`.
4. File is uploaded via `blockBlob.uploadData(buffer, { blobHTTPHeaders })`.
5. The blob URL is persisted to MongoDB.

### Blob Path Conventions

| Type | Path Pattern |
|---|---|
| Generic asset (model/image) | `{filename}` (flat, in container root) |
| Project thumbnail | `thumbnails/projects/{projectId}-{timestamp}.webp` |
| HSE import CSV | `projects/{projectId}/documents/{timestamp}-hse-{originalname}` |
| Schedule import CSV | `projects/{projectId}/documents/{timestamp}-schedule-{originalname}` |
| Project media (image/video) | `projects/{projectId}/media/{timestamp}-{originalname}` |
| Project document | `projects/{projectId}/documents/{timestamp}-{originalname}` |

### Access Control

Blob URLs are direct Azure CDN URLs. There is no SAS token or signed URL mechanism; files in the `uploads` container are assumed to be publicly readable. Write access is controlled by backend authentication.

---

## 11. Deployment

### Backend

- **Platform:** Azure Web App (`fusionxr-backend`), slot: Production, region: Malaysia West
- **Runtime:** Node.js 22.x
- **Start command:** `node server.js`
- **Build:** `npm install && npm run build --if-present` (no build step; pure Node.js)

### Frontend

- **Platform:** Render (inferred from `fusionsite360xr.onrender.com` in CORS allowlist and server.js comments)
- **Build:** `vite build` outputs to `dist/`
- **PWA:** Service worker generated by `vite-plugin-pwa` (Workbox). API calls use `NetworkOnly` cache strategy.

### CI/CD

- **Trigger:** Push to `main` branch
- **Pipeline:** `.github/workflows/main_fusionxr-backend.yml`
  1. Checkout repository
  2. Set up Node.js 22.x
  3. `cd ar-backend && npm install && npm run build --if-present`
  4. Upload `ar-backend/` as artifact
  5. Authenticate to Azure via OIDC (Workload Identity Federation)
  6. Deploy to Azure Web App `fusionxr-backend`, Production slot
- **Frontend CI:** No CI pipeline defined in this repository for the frontend.

### Required Environment Variables

**Backend (`ar-backend/.env`)**

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret for signing/verifying JWTs |
| `AZURE_STORAGE_CONNECTION_STRING` | Azure Blob Storage connection string |
| `STRIPE_SECRET_KEY` | Stripe API secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook endpoint secret |
| `STRIPE_PRICE_SINGLE` | Stripe Price ID for Single plan |
| `STRIPE_PRICE_FOUNDING` | Stripe Price ID for Founding plan |
| `OPENAI_API_KEY` | OpenAI API key |
| `CORS_ORIGINS` | Comma-separated list of allowed origins |
| `APP_URL` | Public frontend URL (used in Stripe redirect URLs) |
| `PORT` | Server port (default: 4000) |

**Frontend (`holoxr-frontend/.env`)**

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Backend API base URL |
| `VITE_DOF_DEVTOOLS` | Enable depth-of-field dev panel (boolean string) |

### Branching Strategy

From git history: feature branches follow the pattern `claude/<description>-<id>` and are merged into `main` via pull requests. `main` is the deployment-triggering branch.

---

## 12. Security Model

### Authentication Type

Stateless JWT authentication. Tokens are stored in `localStorage` (not `httpOnly` cookies), making them accessible to JavaScript — a known XSS risk.

### Role-Based Access Control

Three roles: `admin`, `engineer`, `contractor`.

| Operation | admin | engineer | contractor |
|---|---|---|---|
| Create/update HSE incidents | Yes | No | No |
| Delete HSE incidents | Yes | No | No |
| Upload media | Yes | No | Yes |
| Schedule CSV upload | Yes | No | No |
| View all modules | Yes | Yes | Yes |

Default role for legacy users without a `role` field is `admin`.

### API Protection

- Protected routes require `Authorization: Bearer <token>` header.
- JWT is verified with `jsonwebtoken.verify()` against `JWT_SECRET`.
- Resource ownership is enforced by scoping database queries to `{ _id, userId: req.userId }`.

### Input Validation

- Required fields checked inline in route handlers.
- MongoDB ObjectId validity checked with `mongoose.Types.ObjectId.isValid()`.
- Mongoose schema validators enforce enum values and field constraints.
- File type for CSV imports validated by MIME type and extension.

### Known Security Considerations

1. **JWT in localStorage:** Vulnerable to XSS. Consider migrating to `httpOnly` cookies.
2. **Analytics endpoints are unauthenticated:** Any client can read aggregate analytics data and inject arbitrary events.
3. **File upload endpoints (`/api/upload`, `GET /files`) have no authentication:** The asset library upload and listing are public.
4. **AI query endpoint (`/api/ai/query`) has no authentication:** Any caller with a valid `projectId` can query project data.
5. **Stripe webhook secret** is validated; this is correctly implemented.
6. **No rate limiting** on any endpoint.
7. **CORS allowlist** is configurable via env var; defaults are hardcoded but reasonable.

---

## 13. Current Limitations / Technical Debt

### Incomplete Features (Stubs)

- **Team management** (`routes/team.js`): `POST /invite`, `PATCH /:memberId`, `DELETE /:memberId`, and `GET /search` are all stubbed with `// TODO` comments. No real persistence or email invitations exist.
- **Shared projects:** `GET /api/projects/shared` queries `access.user` and `owner` fields that do not exist in the Project schema. This will always return an empty array.

### Schema / Data Integrity Issues

- **`utils/guards.js`:** `ensureProjectOwner()` checks `project.owner` but the Project schema uses `userId`, not `owner`. This utility is broken if called.
- **HSE CSV import:** The `zoneId` field is never mapped from CSV columns; it always defaults to `''`. Extra fields mentioned in import comments (incidentId, zone, injuryType, rootCause, contractor) are silently dropped by Mongoose `strict: true`.
- **`verifyProject` in `routes/hse.js`:** Does not enforce ownership — only checks project existence (`Project.findOne({ _id: projectId })`), not `{ _id, userId }`.
- **`billingTier` in `AppLayout.jsx`:** Always displayed as `"Free"` because the profile endpoint does not return a billing tier and the value is hardcoded.

### Dead Code / Leftover Files

- `src/components/dashboard/Sidebar_old.jsx` — superseded sidebar; not imported anywhere.
- `src/pages/AnimationTest.jsx` — no route defined for this page in `App.jsx`.
- `src/pages/ProfileView.jsx` — no route defined for this page in `App.jsx`.
- Debug `console.log` statements left throughout `services/intelligence/simulationService.js` (e.g., "SIMULATION DEBUG START").

### Architecture / Design Issues

- **`/dev/intelligence` route** (`DevIntelligence` page) has no authentication check on the frontend.
- **Analytics subscription gate** commented out in `server.js` (`//app.use('/api/analytics', authMiddleware, requireActiveSubscription, analyticsRoutes)`).
- **No test suite:** `package.json` test script exits with code 1.
- **OpenAI quota handling:** On 429, the explanation silently returns `null` with no user-facing indication.
- **Cascading delay simulation** requires MongoDB ObjectId format for `activityId` in the AI query, which is not obvious to end users and throws on non-ObjectId input.

---

## 14. Feature Roadmap (Based on Code Comments)

### Near-term (TODOs in code)

- **Real team invitations:** Replace the stub in `POST /api/team/invite` with an actual email-based invitation flow and persistent membership storage.
- **Team member role persistence:** `PATCH /api/team/:memberId` currently returns `{ ok: true }` without saving changes.
- **Team search:** `GET /api/team/search` returns an empty array; needs user lookup implementation.

### Planned Features (from plan documents)

- **Map & Weather Cards** (`PLAN.md`): Per-project location intelligence. Map card uses Leaflet + OpenStreetMap; Weather card fetches from OpenWeatherMap API using `VITE_WEATHER_API_KEY`. Cards render in `DigitalTwinDashboard` when `project.location.latitude/longitude` are present. Partially implemented (card components exist, integrated into dashboard).
- **PWA offline support** (`PWA-PLAN.md`): Service worker precaching of static assets, safe-area CSS, install prompt utility. PWA plugin is already configured in `vite.config.js`; the plan documents the full implementation steps.

### Schema Extensions Hinted by Code

- **IoT alert source:** `Alert.source` enum includes `'iot'` as a value, suggesting planned integration with IoT sensor data for automated alert ingestion.
- **CSV import for additional data types:** `ProjectDocument.documentCategory` and `datasetType` fields suggest future support for additional dataset types beyond `hse` and `schedule`.
- **Subscription gates on analytics:** Commented-out middleware in `server.js` indicates analytics access is intended to be subscription-gated in the future.
