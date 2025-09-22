const WASM_PATH = 'https://cdn.jsdelivr.net/npm/web-ifc@0.0.167/';
const WASM_CONFIG = {
    COORDINATE_TO_ORIGIN: true,
    USE_FAST_BOOLS: true,
};

let ifcLoader = null;

function configureLoader(loader) {
    if (!loader) return loader;

    const manager = loader.ifcManager;
    if (manager) {
        if (typeof manager.setWasmPath === 'function') {
            manager.setWasmPath(WASM_PATH, true);
        }
        if (typeof manager.setWasmOptions === 'function') {
            manager.setWasmOptions(WASM_CONFIG);
        }
        if (typeof manager.applyWebIfcConfig === 'function') {
            manager.applyWebIfcConfig(WASM_CONFIG);
        }
    }

    return loader;
}

export function getIFCLoader() {
    if (!ifcLoader) {
        ifcLoader = configureLoader(new IFCLoader());
    }
    return ifcLoader;
}

export async function loadIfcMesh(url) {
    if (!url) {
        throw new Error('Missing IFC model url');
    }

    const loader = getIFCLoader();
    const ifcModel = await loader.loadAsync(url);
    const scene = ifcModel?.scene || ifcModel?.mesh || ifcModel;

    return { scene, ifcModel };
}