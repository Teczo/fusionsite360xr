import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { unzipSync } from 'fflate';

const SKETCHFAB_API_TOKEN = "438795e58eda4a47aecc0563fc0d4107"; // Replace with your own token

// Helper function to normalize model size and position
function normalizeModel(scene) {
    const box = new THREE.Box3().setFromObject(scene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // Rescale model to a manageable size (e.g., fit within a 2-unit cube)
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 2 / maxDim;
    scene.scale.set(scale, scale, scale);

    // Recenter model at the world origin
    box.setFromObject(scene); // Update the bounding box after scaling
    box.getCenter(center);
    scene.position.sub(center);

    return scene;
}


export default function SketchfabPanel({ onImport }) {
    const [searchTerm, setSearchTerm] = useState("Teczo");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchModels();
    }, []);

    const fetchModels = async () => {
        setLoading(true);
        try {
            const res = await fetch(`https://api.sketchfab.com/v3/search?type=models&q=${searchTerm}`, {
                headers: {
                    Authorization: `Token ${SKETCHFAB_API_TOKEN}`,
                },
            });
            const data = await res.json();
            const downloadable = (data.results || []).filter((m) => m.isDownloadable);
            setResults(downloadable);
        } catch (err) {
            console.error("Failed to fetch Sketchfab models", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchModels();
    };

    const handleImport = async (model) => {
        try {
            // 1. Get the download info from Sketchfab's API
            const downloadRes = await fetch(`https://api.sketchfab.com/v3/models/${model.uid}/download`, {
                headers: { Authorization: `Token ${SKETCHFAB_API_TOKEN}` },
            });
            const downloadData = await downloadRes.json();

            const loader = new GLTFLoader();
            let gltf;

            // --- Path 1: Direct .glb model (the easy way) ---
            if (downloadData.glb?.url) {
                console.log("✅ GLB available. Loading directly.");
                const glbUrl = downloadData.glb.url;
                const glbBuffer = await fetch(glbUrl).then(res => res.arrayBuffer());
                const blob = new Blob([glbBuffer]);
                const objectUrl = URL.createObjectURL(blob);
                gltf = await loader.loadAsync(objectUrl);
                URL.revokeObjectURL(objectUrl);

                // --- Path 2: Zipped .gltf assets (the 'address book' way) ---
            } else if (downloadData.gltf?.url) {
                console.log("⚠️ No GLB. Using GLTF zip archive.");
                const zipUrl = downloadData.gltf.url;
                const zipBuffer = await fetch(zipUrl).then(res => res.arrayBuffer());
                const unzipped = unzipSync(new Uint8Array(zipBuffer));
                const gltfEntry = Object.entries(unzipped).find(([name]) => name.toLowerCase().endsWith('.gltf'));
                if (!gltfEntry) throw new Error('No .gltf file found in the ZIP archive');

                const fileMap = new Map();
                const objectURLs = [];
                for (const [path, data] of Object.entries(unzipped)) {
                    if (data.length === 0) continue;
                    const blob = new Blob([data]);
                    const url = URL.createObjectURL(blob);
                    objectURLs.push(url);
                    fileMap.set(decodeURIComponent(path).toLowerCase(), url);
                }

                const manager = new THREE.LoadingManager();
                manager.setURLModifier((url) => {
                    const key = decodeURIComponent(url).toLowerCase();
                    for (const [mapKey, mapUrl] of fileMap.entries()) {
                        if (mapKey.endsWith(key)) return mapUrl;
                    }
                    return url;
                });

                loader.setLoadingManager(manager);
                const mainFileURL = fileMap.get(decodeURIComponent(gltfEntry[0]).toLowerCase());
                gltf = await loader.loadAsync(mainFileURL);
                objectURLs.forEach(URL.revokeObjectURL);

            } else {
                throw new Error("No downloadable model format (GLB or GLTF) found.");
            }

            // ✅ NORMALIZE THE MODEL'S SCALE AND POSITION
            normalizeModel(gltf.scene);

            // --- Success: Prepare the final object for your application ---
            const item = {
                id: Date.now().toString(),
                name: model.name,
                type: 'model',
                scene: gltf.scene.clone(), // Clone the now-normalized scene
                animations: gltf.animations.map((clip) => clip.name),
                selectedAnimationIndex: 0,
                transform: {
                    x: 0, y: 0, z: 0,
                    rx: 0, ry: 0, rz: 0,
                    sx: 1, sy: 1, sz: 1,
                },
            };

            if (onImport) onImport(item);

        } catch (err) {
            console.error("Failed to import Sketchfab model:", err);
            alert("This model could not be downloaded or parsed. See console for details.");
        }
    };

    return (
        <div className="flex flex-col gap-4">
            <form onSubmit={handleSearch} className="flex gap-2">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 border px-3 py-1 rounded"
                    placeholder="Search Sketchfab models..."
                />
                <button type="submit" className="bg-blue-600 text-white px-4 py-1 rounded">Search</button>
            </form>

            {loading && <p>Loading...</p>}

            <div className="grid grid-cols-3 gap-4">
                {results.map((model) => (
                    <div key={model.uid} className="border rounded p-2">
                        <img src={model.thumbnails.images[0].url} alt={model.name} className="w-full h-32 object-cover rounded" />
                        <h3 className="text-sm mt-2 font-medium line-clamp-1">{model.name}</h3>
                        <button
                            onClick={() => handleImport(model)}
                            className="mt-2 bg-green-600 text-white px-3 py-1 rounded text-sm w-full"
                        >
                            Import
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}