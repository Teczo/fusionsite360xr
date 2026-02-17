# Plan: Map Card + Weather Card for FusionXR Dashboard

## Architecture Analysis

After exploring the codebase, here's the key finding:

- **DashboardPanel.jsx** = The **project listing page** (KPI stats + project grid cards). It shows ALL projects, not a single project's detail. It has no per-project widget area.
- **DashboardPage.jsx** = Orchestrator page that renders `DashboardPanel` (for "your-designs" view) and an aggregate widget grid (for "digital-twin" view). The digital-twin view renders `TimelineWidget`, `HSEWidget`, etc. across ALL projects.
- **DigitalTwinDashboard.jsx** = The **per-project dashboard** (accessed via `/digital-twin?id={projectId}`). This is where project-specific widgets live: BIM Viewer, S-Curve, Timeline, HSE, Alerts, Media, Documents.

**Integration point:** The new Map and Weather cards belong in **DigitalTwinDashboard.jsx**, not DashboardPanel.jsx, because:
1. The task requires cards to be "project-specific"
2. The task's grid suggestion (BIM Viewer + Map, Weather + HSE + Schedule) matches the DigitalTwinDashboard layout
3. DigitalTwinDashboard already has `projectId` and renders per-project widgets

---

## Step-by-Step Plan

### Step 1: Install Leaflet dependency
```
cd holoxr-frontend && npm install leaflet
```

### Step 2: Import Leaflet CSS in `src/index.css`
Add `@import 'leaflet/dist/leaflet.css';` at the top of the file (before Tailwind directives).

### Step 3: Create `MapCard.jsx`
**File:** `holoxr-frontend/src/components/dashboard/cards/MapCard.jsx`

- Accepts `project` prop (needs `project.location.latitude`, `project.location.longitude`, `project.name`, `project.location.address`)
- Uses `useEffect` + `useRef` to initialize a Leaflet map instance
- Centers on project coordinates with a marker + popup (project name + address)
- Disables scroll zoom (`scrollWheelZoom: false`)
- Fixed height `h-64` inside a card container matching existing styling (`rounded-2xl border border-[#E6EAF0] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)]`)
- Cleans up map on unmount (prevents memory leak)
- Uses OpenStreetMap tiles (free, no API key)

### Step 4: Create `WeatherCard.jsx`
**File:** `holoxr-frontend/src/components/dashboard/cards/WeatherCard.jsx`

- Accepts `project` prop
- On mount, fetches current weather + 5-day forecast from OpenWeatherMap API using `project.location.latitude/longitude`
- Uses `VITE_WEATHER_API_KEY` environment variable (not hardcoded)
- Displays: current temp, condition icon, wind speed, humidity, 5-day mini forecast strip
- Manages `loading`, `error`, `weatherData` states
- Handles: loading spinner, API failure graceful fallback, missing location
- Card styling matches existing dashboard cards

### Step 5: Create `LocationSetupCard.jsx`
**File:** `holoxr-frontend/src/components/dashboard/cards/LocationSetupCard.jsx`

- Rendered when `project.location` doesn't have valid lat/lng
- Shows: MapPin icon, "Enable Location Intelligence" title, subtitle explaining benefits, "Add Location" button
- Button is informational (navigates or shows guidance to edit project)
- Card styling matches existing dashboard cards
- Uses `lucide-react` icons (already in dependencies)

### Step 6: Modify `DigitalTwinDashboard.jsx`
**File:** `holoxr-frontend/src/pages/DigitalTwinDashboard.jsx`

Changes:
1. **Add project data fetch** — Currently DigitalTwinDashboard only has `projectId` from URL params but never fetches the full project object. Add a `useEffect` to fetch `/api/projects/{projectId}` to get the project data (including `location`).
2. **Add conditional rendering** — After the existing S-Curve + BIM Viewer row:

```jsx
const hasLocation = project?.location?.latitude && project?.location?.longitude;
```

If `hasLocation`:
```jsx
<MapCard project={project} />
<WeatherCard project={project} />
```

If `!hasLocation` (and projectId exists):
```jsx
<LocationSetupCard />
```

3. **Layout** — Add as a new row in the grid:
   - Map + Weather side-by-side (`grid grid-cols-1 lg:grid-cols-2 gap-5`)
   - Placed between BIM Viewer row and Timeline row

---

## Files Created (3 new)
1. `holoxr-frontend/src/components/dashboard/cards/MapCard.jsx`
2. `holoxr-frontend/src/components/dashboard/cards/WeatherCard.jsx`
3. `holoxr-frontend/src/components/dashboard/cards/LocationSetupCard.jsx`

## Files Modified (2 existing)
1. `holoxr-frontend/src/index.css` — Add Leaflet CSS import
2. `holoxr-frontend/src/pages/DigitalTwinDashboard.jsx` — Add project fetch + conditional Map/Weather/LocationSetup rendering

## Files NOT Modified (backward compatibility)
- `ar-backend/models/Project.js` — Schema untouched
- `ar-backend/routes/*` — No API changes
- `DashboardPanel.jsx` — Project listing page untouched
- `DashboardPage.jsx` — Aggregate widget grid untouched
- All existing widgets — No changes

## Backward Compatibility Guarantees
1. **No schema changes** — Project model stays identical
2. **No API changes** — No routes added/modified
3. **Optional rendering** — Map/Weather only appear when `project.location.latitude && project.location.longitude` exist; old projects without location see LocationSetupCard or nothing
4. **No existing component changes** — All existing widgets, BIM viewer, etc. remain unchanged
5. **Graceful degradation** — Weather API failure shows error state, not a crash
6. **No DB storage of weather** — Fetched dynamically on each render
7. **Safe optional chaining** — All location access uses `?.` operator
