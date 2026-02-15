# Projects Page Redesign - Refactoring Plan

## Current State Analysis

### Architecture
- **Framework**: React 19 + Vite + Tailwind CSS 4
- **Styling**: Tailwind utility classes + custom `@theme` tokens in `index.css` + `tailwind.config.js`
- **Icons**: lucide-react (primary), react-icons, @heroicons/react
- **Font**: Lato (local)

### Current Design
- Dark glass morphism theme (`bg-black/30 backdrop-blur-lg border-white/10`)
- Colors: appbg `#121212`, surface `#1E1E1E`, text white/gray
- Sidebar: fixed left, dark with glass, collapsible
- Header: search bar only
- Project cards: dark surface with thumbnails, basic info
- No KPI summary cards

---

## Refactoring Plan (7 Steps)

### Step 1: Update Theme Tokens & Global Styles
**Files**: `src/index.css`, `tailwind.config.js`

**Changes**:
- Replace dark theme tokens with light enterprise tokens:
  - `appbg`: `#121212` → `#F5F7FA` (soft light gray)
  - `surface`: `#1E1E1E` → `#FFFFFF` (white)
  - `textpri`: `#FFFFFF` → `#111827` (dark gray)
  - `textsec`: `#B0BEC5` → `#6B7280` (medium gray)
  - `brand`: `#00E676` → `#3BB2A5` (teal-green)
  - `brand-600`: `#00C853` → `#2D9F93` (darker teal)
- Add new tokens:
  - `--color-accent-success`: `#10B981` (green)
  - `--color-accent-warning`: `#F59E0B` (amber)
  - `--color-accent-error`: `#EF4444` (red)
  - `--color-sidebar-bg`: `#FFFFFF`
  - `--color-sidebar-active`: `#E8F8F5` (light teal)
  - `--color-card-shadow`: `0 2px 12px rgba(0,0,0,0.06)`
- Update `:root` background from `#242424` → `#F5F7FA`
- Add Inter font (via system-ui fallback stack)
- Update utility classes (`btn-gradient-primary`, `card`, `card-hover`, etc.)
- Remove dark `prefers-color-scheme` media query overrides

### Step 2: Redesign Sidebar
**File**: `src/components/dashboard/Sidebar.jsx`

**Changes**:
- Replace dark glass background with light white background + subtle border
- Update nav items:
  - Rename "Browse" section to include: Dashboard, Doc Management, Project Management, Asset Management
  - Active item: soft teal pill background (`bg-[#E8F8F5] text-[#3BB2A5]`)
  - Idle item: `text-gray-500 hover:bg-gray-50`
- Update profile section to light theme
- Update menu popup to light theme
- Keep all existing behavior: collapse, keyboard shortcut, localStorage sync, profile menu
- Keep existing nav keys/routes unchanged (just relabel for display)

### Step 3: Redesign Top Bar / Header
**File**: `src/components/dashboard/DashboardHeader.jsx`

**Changes**:
- Add workspace breadcrumb: "Workspace > Dashboard"
- Right side controls:
  - Notification bell icon
  - Filter icon
  - Time range pills: "Last 7 days", "Last 30 days" (visual only, no logic change)
  - "+ New Project" CTA button (teal gradient) — wired to existing `setShowModal`
- Restyle search bar to light theme
- Pass `setShowModal` prop from DashboardPage

### Step 4: Add KPI Summary Cards
**File**: `src/components/dashboard/DashboardPanel.jsx`

**Changes**:
- Add top row of 4 metric cards above the project grid:
  - Total Projects (count from `projects.length`)
  - Active Projects (derived from projects)
  - Completed Projects (derived)
  - On Hold Projects (derived)
- Each card: white bg, soft colored icon badge, percentage delta indicator, rounded corners
- Responsive grid: 4 columns on desktop, 2 on tablet, 1 on mobile
- Data derived from existing `projects` array (no new API calls)

### Step 5: Redesign Project Cards
**File**: `src/components/dashboard/DashboardPanel.jsx`

**Changes**:
- Replace dark cards with light enterprise cards:
  - White background, `shadow-sm`, `rounded-xl`, `border border-gray-100`
  - Project icon badge (colored rounded square) instead of thumbnail
  - Project name (semibold)
  - Status badge (Active/Completed/On Hold) with color coding
  - "Updated X ago" relative time
  - Horizontal progress bar with percentage
  - Ellipsis menu (top-right) — reuse existing menu logic
- Uniform card height
- Responsive grid: 4 cols desktop, 2 tablet, 1 mobile
- Keep all existing actions: Open, Edit, Share, Delete
- Update shared tab cards similarly
- Update trash tab cards to light theme

### Step 6: Redesign Create Project Modal
**File**: `src/pages/DashboardPage.jsx`

**Changes**:
- Convert modal from dark theme to light theme:
  - White background, soft shadow, rounded corners
  - Light input fields
  - Teal gradient CTA button
  - Subtle backdrop
- Update main layout wrapper:
  - Remove dark background image
  - Apply light `bg-[#F5F7FA]` background
  - Update text color from white to dark
- Keep all existing modal logic unchanged

### Step 7: Spacing & Typography Polish
**Files**: All modified files

**Changes**:
- Apply consistent spacing:
  - Page padding: 24-32px
  - Card internal padding: 16-20px
  - Grid gap: 16-24px
  - Sidebar item height: 44-48px
- Typography:
  - Page title: 24-28px semibold
  - Card titles: 16-18px semibold
  - Meta text: 12-14px regular
- Font stack: `'Inter', system-ui, -apple-system, sans-serif`

---

## Files Modified (Summary)
| File | Change Type |
|------|-------------|
| `src/index.css` | Theme tokens, utilities, global styles |
| `tailwind.config.js` | Color palette update |
| `src/components/dashboard/Sidebar.jsx` | Light sidebar redesign |
| `src/components/dashboard/DashboardHeader.jsx` | Full header redesign |
| `src/components/dashboard/DashboardPanel.jsx` | KPI cards + project cards redesign |
| `src/pages/DashboardPage.jsx` | Layout wrapper + modal light theme |

## NOT Modified
- Routing logic
- API calls / fetch functions
- Data models / state management
- Feature behavior / permissions
- Team/Share/Billing/Analytics panels (internal logic)
- Studio, AR, Digital Twin pages
