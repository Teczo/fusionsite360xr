import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { copyFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const IFC_ASSETS = [
  'web-ifc.wasm',
  'web-ifc-mt.wasm',
  'web-ifc-worker.js',
  'web-ifc-mt-worker.js'
];

let warnedAboutMissingAssets = false;

async function copyIfcAssets() {
  const sourceDir = resolve(__dirname, 'node_modules/web-ifc');
  const targetDir = resolve(__dirname, 'public/ifc');
  const missingAssets = [];

  try {
    await mkdir(targetDir, { recursive: true });

    await Promise.all(
      IFC_ASSETS.map(async (asset) => {
        const source = resolve(sourceDir, asset);
        if (!existsSync(source)) {
          missingAssets.push(asset);
          return;
        }

        await copyFile(source, resolve(targetDir, asset));
      })
    );

    if (missingAssets.length && !warnedAboutMissingAssets) {
      warnedAboutMissingAssets = true;
      console.warn(
        `[ifc-assets] Missing IFC runtime files: ${missingAssets.join(', ')}. ` +
        'Ensure the "web-ifc" package is installed so IFCLoader can load its WASM runtime.'
      );
    }
  } catch (error) {
    console.warn('[ifc-assets] Failed to copy IFC assets:', error);
  }
}

function ifcAssetsPlugin() {
  return {
    name: 'copy-ifc-assets',
    async buildStart() {
      await copyIfcAssets();
    },
    async configureServer() {
      await copyIfcAssets();
    }
  };
}

export default defineConfig({
  base: '/',
  server: { host: '0.0.0.0', port: 5173 },
  assetsInclude: ['**/*.wasm'],
  plugins: [
    react(),
    tailwindcss(),
    ifcAssetsPlugin(),
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
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2,ttf}'],
        // Exclude large marketing images and WASM from precache
        globIgnores: ['**/images/slide*.png', '**/login-illustration.png', '**/ifc/**'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3 MB (covers JS bundle)
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/holoxr-backend\.onrender\.com\/.*/i,
            handler: 'NetworkOnly'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      // 👇 any import of this utils file will go through our shim
      'three/examples/jsm/utils/BufferGeometryUtils':
        '/src/shims/BufferGeometryUtils.js',
    },
  },
});
