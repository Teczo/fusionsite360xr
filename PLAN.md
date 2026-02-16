# Responsive Dashboard Layout Refactoring Plan

## Current State Analysis

### Critical Finding: Duplicated Layouts
The app currently has **three pages that each independently render their own Sidebar + Header**, creating layout duplication:

| Page | File | Has Own Sidebar? | Has Own Header? | Anti-patterns |
|------|------|-----------------|-----------------|---------------|
| DashboardPage | `src/pages/DashboardPage.jsx` | Yes (line 275) | Yes (line 286) | `h-screen`, nested overflow, hardcoded `pl-[72px]/pl-[260px]` |
| DigitalTwinDashboard | `src/pages/DigitalTwinDashboard.jsx` | Yes (line 52) | Yes (line 61) | `h-screen`, hardcoded `pl-[72px]/pl-[260px]`, no scroll container |
| DashboardLayout | `src/layouts/DashboardLayout.jsx` | Yes (line 55) | Yes (line 64) | `h-screen`, fixed header, hardcoded `pl-24/pl-72` |

**Note:** `DashboardLayout.jsx` exists but is **not used in App.jsx routing** — DashboardPage renders directly. This is a wasted abstraction.

### Anti-Patterns Found
- `h-screen` on 4+ root containers (should be `h-dvh`)
- Fixed-positioned header with hardcoded left padding to avoid sidebar
- Sidebar uses `fixed` positioning, content compensates with `pl-[260px]`
- Nested `overflow-hidden` + `overflow-y-auto` stacking
- No mobile responsiveness on sidebar (no drawer, no toggle)
- No landscape mode handling
- `min-w-0` missing on flex children
- 3D canvas container at fixed `h-[420px]` with no flex-based sizing

---

## Refactoring Plan (8 Steps)

### Step 1: Update `tailwind.config.js`
**File:** `holoxr-frontend/tailwind.config.js`

**Changes:**
- Add `landscape` screen using raw media query: `{'raw': '(orientation: landscape)'}`
- No other config changes needed (existing colors, shadows, radii preserved)

---

### Step 2: Create a `useSidebarState` Hook
**New file:** `holoxr-frontend/src/hooks/useSidebarState.js`

**Purpose:** Centralize sidebar state management (currently duplicated in DashboardPage, DigitalTwinDashboard, DashboardLayout).

**State:**
- `sidebarOpen` (boolean) — mobile drawer open/closed
- `sidebarCollapsed` (boolean) — tablet/desktop collapsed mode

**Logic:**
- Desktop (>=1024px): ignores `sidebarOpen`, sidebar always visible, `sidebarCollapsed` controls width
- Tablet (768px-1023px): sidebar always visible, `sidebarCollapsed` controls width (icons only vs full)
- Mobile (<768px): sidebar hidden by default, `sidebarOpen` controls slide-in drawer
- Persist `sidebarCollapsed` to `localStorage` (preserving existing `ui.sidebar.collapsed` key)
- Cross-tab sync via `storage` event (preserving existing behavior)
- Keyboard shortcut Ctrl/Cmd+B (preserving existing behavior)
- Close mobile drawer on route change
- Use `window.matchMedia` to detect breakpoints and auto-adjust behavior
- Mobile landscape: behave like tablet (collapsible, not drawer)

---

### Step 3: Refactor `Sidebar.jsx`
**File:** `holoxr-frontend/src/components/dashboard/Sidebar.jsx`

**Changes:**
- Accept new props: `sidebarOpen`, `setSidebarOpen`, `sidebarCollapsed`, `setSidebarCollapsed`, `isMobile`, `isTablet`
- Remove internal keyboard shortcut + localStorage logic (moved to hook)
- Remove `fixed left-0 top-0 bottom-0` positioning (sidebar will be in normal flex flow on desktop/tablet)

**Desktop (>=1024px):**
- `w-64` (expanded) or `w-[72px]` (collapsed) with `shrink-0`
- Always visible in flex flow (not fixed)

**Tablet (768px-1023px) + Mobile Landscape:**
- Same as desktop but starts collapsed (`w-[72px]`)
- Toggle expands to `w-64`

**Mobile (<768px, portrait):**
- Slide-in drawer using `fixed inset-y-0 left-0 z-40`
- `transform transition-transform duration-300`
- `-translate-x-full` when closed, `translate-x-0` when open
- Width: `w-[260px]` (always expanded in drawer mode)

**Mobile overlay backdrop:**
- Rendered in AppLayout: `<div className="fixed inset-0 bg-black/50 z-30 lg:hidden" />` when drawer is open
- Click to close

**What stays the same:**
- All nav items, icons, section structure
- Profile menu (bottom)
- All visual styles (colors, shadows, border radius, fonts)
- "New Project" CTA button

---

### Step 4: Refactor `DashboardHeader.jsx` (Topbar)
**File:** `holoxr-frontend/src/components/dashboard/DashboardHeader.jsx`

**Changes:**
- Remove `sticky top-0 z-40` from header element
- Use `shrink-0 border-b border-gray-200` (flex-child in layout, not fixed/sticky)
- Add sidebar toggle button (hamburger/menu icon) visible only on `lg:hidden`
- Accept `onToggleSidebar` prop for the toggle button

**What stays the same:**
- All controls (breadcrumb, search, bell, filter, time pills, new project button)
- All visual styles

---

### Step 5: Create Unified `AppLayout.jsx`
**File:** `holoxr-frontend/src/layouts/AppLayout.jsx` (replaces existing `DashboardLayout.jsx`)

**Structure:**
```
<div className="flex h-dvh overflow-hidden bg-[#f7f7f9] dark:bg-[#0b0c0f]">
  {/* Mobile overlay */}
  {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" />}

  {/* Sidebar */}
  <Sidebar ... />

  {/* Right column */}
  <div className="flex flex-1 flex-col min-w-0">
    {/* Topbar (NOT fixed, in flex flow) */}
    <DashboardHeader ... />

    {/* Scrollable content area */}
    <main className="flex-1 overflow-auto min-h-0">
      <div className="w-full min-h-full rounded-2xl border ... glass-panel ...">
        <div className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </div>
    </main>
  </div>
</div>
```

**Key properties:**
- `h-dvh` on root (not `h-screen`)
- `overflow-hidden` only on root
- `min-w-0` on the right-column flex child
- `min-h-0` on the scrollable `<main>`
- `overflow-auto` only on `<main>`
- NO fixed positioning on header
- NO hardcoded left-padding to compensate for sidebar
- Sidebar participates in flex flow (desktop/tablet) or overlays (mobile)

**State management:**
- Uses `useSidebarState` hook
- Passes outlet context (preserving existing pattern with theme, user, navigate, etc.)

---

### Step 6: Update `App.jsx` Routing
**File:** `holoxr-frontend/src/App.jsx`

**Changes:**
- Wrap `/dashboard/:panel?` and `/digital-twin` under `<AppLayout>` as a parent route with `<Outlet>`
- Import `AppLayout` instead of individual per-page layouts

**New route structure:**
```jsx
<Route element={<RequireAuth><AppLayout /></RequireAuth>}>
  <Route path="/dashboard/:panel?" element={<DashboardPage />} />
  <Route path="/digital-twin" element={<DigitalTwinDashboard />} />
</Route>
```

**StudioPage** (`/studio`) keeps its own layout — it's a 3D editor with a fundamentally different UI (floating panels over canvas). No changes to StudioPage routing.

---

### Step 7: Strip Layout Duplication from Page Components
**Files:**
- `holoxr-frontend/src/pages/DashboardPage.jsx`
- `holoxr-frontend/src/pages/DigitalTwinDashboard.jsx`

**DashboardPage.jsx changes:**
- Remove `<Sidebar>` rendering
- Remove `<DashboardHeader>` rendering
- Remove outer `<div className="flex h-screen ...">` wrapper
- Remove `pl-[72px]/pl-[260px]` padding compensation
- Remove `isCollapsed` / sidebar state (comes from Outlet context via AppLayout)
- Remove `showModal` sidebar prop wiring (moved to AppLayout)
- Content becomes just the page body (title + panels + modals)
- Keep ALL business logic, data fetching, team API stubs

**DigitalTwinDashboard.jsx changes:**
- Remove `<Sidebar>` rendering
- Remove `<TopBar>` rendering
- Remove outer `<div className="flex h-screen ...">` wrapper
- Remove `pl-[72px]/pl-[260px]` padding compensation
- Remove `isCollapsed` / sidebar state
- Content becomes just the page body (KPI cards, 3D panel, etc.)
- Keep all business logic, 3D canvas, fullscreen modal

**Fix 3D Canvas container in DigitalTwinDashboard:**
- Ensure canvas container has `min-w-0 min-h-0` on parent
- Keep `h-[420px]` for the preview (it's an embedded preview, not full layout)

---

### Step 8: Delete Unused `DashboardLayout.jsx`
**File:** `holoxr-frontend/src/layouts/DashboardLayout.jsx`

This file is currently not referenced in routing and will be superseded by `AppLayout.jsx`. Delete it.

---

## Files Modified Summary

| File | Action |
|------|--------|
| `tailwind.config.js` | Add landscape screen |
| `src/hooks/useSidebarState.js` | **New** — centralized sidebar state |
| `src/components/dashboard/Sidebar.jsx` | Refactor for responsive (desktop/tablet/mobile) |
| `src/components/dashboard/DashboardHeader.jsx` | Remove fixed/sticky, add toggle button |
| `src/layouts/AppLayout.jsx` | **New** — unified responsive layout |
| `src/layouts/DashboardLayout.jsx` | **Delete** |
| `src/App.jsx` | Update routing to use AppLayout |
| `src/pages/DashboardPage.jsx` | Strip layout duplication |
| `src/pages/DigitalTwinDashboard.jsx` | Strip layout duplication |

## Files NOT Modified
- `src/components/Studio/StudioPage.jsx` — different layout paradigm (3D editor with floating panels)
- `src/index.css` — no changes to utility classes or theme tokens
- All component visual styles, colors, typography, spacing tokens
- All business logic, API calls
- Existing routing logic (only wrapping in layout)
- AR viewer pages

## Breakpoint Behavior Summary

| Screen | Width | Sidebar | Topbar | Layout |
|--------|-------|---------|--------|--------|
| Desktop | >=1024px | Fixed in flex, `w-64`/`w-[72px]` toggle | Normal, in flow | 2-column |
| Tablet | 768px-1023px | Collapsible, `w-[72px]` default | Toggle button visible | 2-column |
| Mobile Portrait | <768px | Drawer (slide-in) | Toggle button visible | 1-column |
| Mobile Landscape | <768px + landscape | Collapsible (like tablet) | Toggle button visible | 2-column compact |
