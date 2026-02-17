# Plan: Refactor Create Project Modal

## Current State Analysis

### Files Involved
| File | Role | Current State |
|------|------|---------------|
| `ar-backend/models/Project.js` | Mongoose schema | Has: `userId`, `name`, `description`, `thumbnail`, `scene`, `published`, `publishedAt`, `publishedScene`, `trashed`, timestamps |
| `ar-backend/routes/project.js:29-45` | POST `/api/projects` | Only accepts `name` and `description` |
| `holoxr-frontend/src/pages/DashboardPage.jsx:329-371` | Create Project Modal UI | Inline modal with only `name` and `description` fields |
| `holoxr-frontend/src/components/dashboard/DashboardPanel.jsx` | Dashboard grid | Already handles `proj.status` gracefully via `getProjectStatus()` — **no changes needed** |
| `holoxr-frontend/src/layouts/AppLayout.jsx:106-128` | Secondary placeholder modal | Has empty submit handler — will be removed (DashboardPage owns the real modal) |

### Key Observation
`DashboardPanel.jsx:27-35` already has a `getProjectStatus()` function that checks `proj.status` first, then falls back to date-based derivation. Old projects without a `status` field will continue working with zero changes to the dashboard.

---

## Changes (4 Steps, Incremental)

### Step 1: Extend Project Schema Safely
**File:** `ar-backend/models/Project.js`

Add the following fields **after** existing fields (no deletions, no renames):

```js
startDate: { type: Date, default: null },
endDate: { type: Date, default: null },
status: {
  type: String,
  enum: ["Planning", "Active", "On Hold", "Completed"],
  default: "Planning"
},
tags: { type: [String], default: [] },
projectCode: { type: String, default: null },
teamMembers: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}],   // default: []
location: {
  address: { type: String, default: null },
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null }
}
```

**Backward compatibility:** All new fields have defaults (`null`, `[]`, or `"Planning"`). Old documents missing these fields will get default values when read by Mongoose. No migration script needed.

---

### Step 2: Update POST Endpoint
**File:** `ar-backend/routes/project.js` (the `POST /projects` handler at line 29)

- Destructure the new optional fields from `req.body`
- Build the project object conditionally — only include fields that are actually provided
- Keep validation minimal: require `name`, `startDate`, `endDate`
- All other fields remain optional

No changes to GET, PUT, DELETE, or any other endpoints. Existing GET endpoints already return the full document, so new fields will be included automatically.

---

### Step 3: Refactor CreateProjectModal in DashboardPage
**File:** `holoxr-frontend/src/pages/DashboardPage.jsx`

Replace the inline modal (lines 329-371) with a structured, section-based form:

**Section 1 — Basic Info (always visible):**
- Project Name * (text input, required)
- Description (textarea, recommended)
- Start Date * (date input, required)
- End Date * (date input, required)
- Status (dropdown, default: "Planning")

**Section 2 — Classification (collapsible, "+ Add Classification"):**
- Tags (comma-separated text input)
- Project Code (text input)

**Section 3 — Team Members (collapsible, "+ Add Team Members"):**
- Team Members (text input, placeholder for future search)

**Section 4 — Location (collapsible, "+ Add Location"):**
- Address (text input)
- Latitude / Longitude (number inputs)

**State changes:**
- Expand `form` state from `{ name, description }` to include all new fields
- Add `showClassification`, `showTeam`, `showLocation` boolean toggle states
- Update `handleCreate` to build payload and strip empty optional fields before POST
- Update validation: require `name`, `startDate`, `endDate`

**UI details:**
- Collapsible sections with CSS transition (`overflow-hidden`, `max-height`, `transition-all`)
- Subtle `border-t border-gray-100` dividers between sections
- Modal `max-w-md` width unchanged
- Submit/Cancel buttons unchanged in style
- Scrollable modal body (`max-h-[80vh] overflow-y-auto`) if content overflows

---

### Step 4: Remove duplicate modal from AppLayout
**File:** `holoxr-frontend/src/layouts/AppLayout.jsx`

Remove the placeholder modal (lines 106-128) and the unused `handleCreateProject`, `projectName`, `isCreating` state. The Sidebar/Header "New Project" buttons set `showCreateModal` in context, and DashboardPage reads this to open its own fully-functional modal.

Wire `showCreateModal` from AppLayout context into DashboardPage's `showModal` state so that clicking "New Project" in the Sidebar/Header triggers the real modal.

---

## Files NOT Modified (and why)
| File | Reason |
|------|--------|
| `DashboardPanel.jsx` | Already handles missing `status` via `getProjectStatus()` fallback |
| BIM/CSV upload components | Out of scope per requirements |
| Other routes (GET, PUT, DELETE) | No changes needed — Mongoose auto-includes new fields in responses |
| Dashboard routing | No changes |
| `Sidebar.jsx` / `DashboardHeader.jsx` | No changes — they already call `setShowModal(true)` |

## Backward Compatibility Guarantees
1. **No fields deleted or renamed** in schema
2. **All new fields have defaults** — old documents work without migration
3. **`getProjectStatus()`** in DashboardPanel already falls back when `proj.status` is undefined
4. **Optional chaining** used in frontend for all new fields
5. **POST endpoint** still works with just `{ name, description }` — old clients unaffected
6. **No breaking API changes** — response shape is additive only
