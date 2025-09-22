import { unzipSync } from 'fflate';

// Keep wasm served from jsDelivr (adjust version if you see wasm 404s)
const DEFAULT_WASM_CDN = 'https://cdn.jsdelivr.net/npm/web-ifc@0.0.56/wasm/';

// Used for a local import if you later install the package (optional)
const IFC_LOADER_MODULE_ID = 'web-ifc-three/IFCLoader.js';

// Use bundled ESM so the browser doesn't choke on bare imports:
// 'bundle' packs deps (web-ifc, three-mesh-bvh, etc.) inside one file.
// target keeps syntax modern for Vite/dev browsers.
const IFC_LOADER_CDNS = [
    'https://esm.sh/web-ifc-three@0.0.126/IFCLoader?target=es2021&external=three,three/examples/jsm/utils/BufferGeometryUtils',
    'https://esm.sh/web-ifc-three@latest/IFCLoader?target=es2021&external=three,three/examples/jsm/utils/BufferGeometryUtils',
    // (optional fallbacks)
    'https://esm.run/web-ifc-three@0.0.126/IFCLoader?bundle',
    'https://esm.run/web-ifc-three@latest/IFCLoader?bundle',
];

let loaderModulePromise;

async function importIfcLoaderModule() {
    if (!loaderModulePromise) {
        loaderModulePromise = (async () => {
            const dynamicImport = (specifier) => import(/* @vite-ignore */ specifier);
            let lastError;
            try {
                const localModule = await dynamicImport(IFC_LOADER_MODULE_ID);
                if (localModule?.IFCLoader || localModule?.default) {
                    return localModule.IFCLoader || localModule.default;
                }
            } catch (localError) {
                console.warn('Falling back to CDN for IFCLoader', localError);
                lastError = localError;
            }

            let lastCdnError = lastError;
            for (const url of IFC_LOADER_CDNS) {
                try {
                    const mod = await dynamicImport(url);
                    if (mod?.IFCLoader || mod?.default) {
                        return mod.IFCLoader || mod.default;
                    }
                } catch (e) {
                    lastCdnError = e;
                    // try next candidate
                }
            }
            throw lastCdnError || new Error('Unable to resolve IFCLoader module from CDN.');

        })();
    }
    return loaderModulePromise;
}

async function prepareIfcSource(url) {
    if (!url) throw new Error('Missing IFC URL');
    const lower = url.toLowerCase();
    if (!lower.endsWith('.zip')) {
        return { url, revoke: null };
    }

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download IFC archive (${response.status})`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const zip = unzipSync(new Uint8Array(arrayBuffer));
    const entry = Object.keys(zip).find((name) => name.toLowerCase().endsWith('.ifc'));
    if (!entry) {
        throw new Error('No .ifc file found inside archive');
    }
    const blob = new Blob([zip[entry]], { type: 'application/octet-stream' });
    const objectUrl = URL.createObjectURL(blob);
    return {
        url: objectUrl,
        revoke: () => URL.revokeObjectURL(objectUrl),
    };
}

export async function loadIfcAsset(url, { wasmPath = DEFAULT_WASM_CDN } = {}) {
    const IFCLoader = await importIfcLoaderModule();
    const loader = new IFCLoader();
    if (loader.ifcManager?.setWasmPath) {
        loader.ifcManager.setWasmPath(wasmPath);
    }
    const { url: sourceUrl, revoke } = await prepareIfcSource(url);

    return new Promise((resolve, reject) => {
        loader.load(
            sourceUrl,
            (ifcModel) => {
                const cleanup = () => {
                    revoke?.();
                    if (typeof loader.ifcManager?.dispose === 'function') {
                        loader.ifcManager.dispose();
                    }
                };
                resolve({ ifcModel, cleanup });
            },
            undefined,
            (error) => {
                revoke?.();
                reject(error);
            }
        );
    });
}

// Studio-friendly wrapper: returns a scene-like object
export async function loadIfcMesh(url, opts) {
    const { ifcModel, cleanup } = await loadIfcAsset(url, opts);
    const scene = ifcModel?.scene || ifcModel?.mesh || ifcModel;
    return { scene, ifcModel, cleanup };
}