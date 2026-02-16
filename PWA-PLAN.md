# FusionXR PWA Conversion Plan

## Overview
Convert the existing FusionXR Vite + React application (`holoxr-frontend/`) into a fully compliant Progressive Web App. No changes to routing, layout, Three.js viewer, or backend.

---

## Step 1 — Install `vite-plugin-pwa`

**File:** `holoxr-frontend/package.json`

```bash
cd holoxr-frontend && npm install vite-plugin-pwa --save-dev
```

This pulls in Workbox under the hood and provides the `VitePWA` Vite plugin plus the `virtual:pwa-register` module.

---

## Step 2 — Update `vite.config.js`

**File:** `holoxr-frontend/vite.config.js`

Add `VitePWA` to the plugins array alongside the existing `react()`, `tailwindcss()`, and `ifcAssetsPlugin()` plugins. Configuration:

```js
import { VitePWA } from 'vite-plugin-pwa'

// Inside plugins array:
VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['icons/*.png', 'holo-icon.png'],
  manifest: {
    name: 'FusionXR',
    short_name: 'FusionXR',
    description: 'FusionXR BIM Intelligence Platform',
    theme_color: '#0f172a',
    background_color: '#0f172a',
    display: 'standalone',
    orientation: 'portrait',
    scope: '/',
    start_url: '/',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
    ]
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,png,jpg,svg,woff2,ttf}'],
    navigateFallback: '/index.html',
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/holoxr-backend\.onrender\.com\/.*/i,
        handler: 'NetworkOnly'
      }
    ]
  }
})
```

**What stays the same:** `react()`, `tailwindcss()`, `ifcAssetsPlugin()`, `resolve.alias`, `server` config, `assetsInclude`, `base`.

---

## Step 3 — Add iOS-Specific Meta Tags to `index.html`

**File:** `holoxr-frontend/index.html`

Add inside `<head>`:

```html
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="FusionXR" />
<link rel="apple-touch-icon" href="/icons/icon-192.png" />
<meta name="theme-color" content="#0f172a" />
<meta name="description" content="FusionXR BIM Intelligence Platform" />
```

Also update:
- `<title>` from "HoloXR" to "FusionXR"
- Viewport meta to include `viewport-fit=cover` for safe-area support

---

## Step 4 — Create Icon Files

**Directory:** `holoxr-frontend/public/icons/`

Generate `icon-192.png` (192×192) and `icon-512.png` (512×512) from the existing `holo-icon.png`. Will use a Node.js script with the `sharp` library (or canvas fallback) to resize the existing icon with proper padding on a dark background (`#0f172a`) for maskable safety.

Requirements:
- Dark theme background (`#0f172a`)
- Centered with safe maskable margins (at least 10% padding on each side)
- Optimized PNG

---

## Step 5 — Safe Area + Fullscreen Layout CSS

**File:** `holoxr-frontend/src/index.css`

Add to the existing global styles (non-destructive — appending only):

```css
html, body, #root {
  height: 100%;
}

body {
  margin: 0;
  overscroll-behavior: none;
  background-color: #0f172a;
}

.app-container {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
  height: 100dvh;
}
```

**File:** `holoxr-frontend/index.html`

Update viewport meta to: `width=device-width, initial-scale=1.0, viewport-fit=cover`

**File:** `holoxr-frontend/src/main.jsx`

Wrap the rendered tree with the `app-container` div:

```jsx
<div className="app-container">
  <BrowserRouter>
    <App />
  </BrowserRouter>
</div>
```

---

## Step 6 — Create Standalone Detection Utility

**File:** `holoxr-frontend/src/utils/pwa.js` (new file)

```js
import { useState, useEffect } from 'react';

export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
}

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  return { canInstall: !!deferredPrompt, promptInstall };
}
```

This is a utility file — no UI added. Available for future integration.

---

## Step 7 — Service Worker Registration in `main.jsx`

**File:** `holoxr-frontend/src/main.jsx`

Add at top level (outside the React tree):

```js
import { registerSW } from 'virtual:pwa-register'
registerSW({ immediate: true })
```

---

## Step 8 — Verify Build

- Run `npm run build` to confirm the build succeeds
- Verify `dist/` contains:
  - `manifest.webmanifest`
  - `sw.js` (service worker)
  - `icons/icon-192.png` and `icons/icon-512.png`
- Confirm no existing functionality is broken

---

## Files Modified (Summary)

| File | Change |
|------|--------|
| `holoxr-frontend/package.json` | Add `vite-plugin-pwa` dev dependency |
| `holoxr-frontend/vite.config.js` | Add `VitePWA` plugin with manifest + workbox config |
| `holoxr-frontend/index.html` | Add iOS meta tags, theme-color, description, viewport-fit, update title |
| `holoxr-frontend/src/index.css` | Add safe-area, fullscreen, overscroll styles |
| `holoxr-frontend/src/main.jsx` | Add SW registration, wrap with `app-container` div |
| `holoxr-frontend/src/utils/pwa.js` | **New file**: `isStandalone()` + `useInstallPrompt()` |
| `holoxr-frontend/public/icons/` | **New directory**: `icon-192.png`, `icon-512.png` |

## Files NOT Modified

- `src/App.jsx` — routing untouched
- `src/layouts/AppLayout.jsx` — layout untouched
- `tailwind.config.js` — no changes
- All existing components, pages, services — no changes
- `ar-backend/` — no changes

---

## Risk Mitigation

1. **Three.js / WebXR**: No changes to any Three.js or AR components. Service worker only caches static assets.
2. **React Router**: `navigateFallback: '/index.html'` ensures SPA routing works through the service worker.
3. **API calls**: Explicitly set to `NetworkOnly` so auth tokens and dynamic data are never stale-cached.
4. **WASM files**: Included in static asset cache so IFC viewer works offline for previously loaded models.
5. **Build pipeline**: Only additive changes to vite config — existing plugins preserved.
