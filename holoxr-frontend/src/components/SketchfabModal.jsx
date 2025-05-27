import { useEffect, useState } from 'react';
import JSZip from 'jszip';
import { FileLoader, LoadingManager } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

const SKETCHFAB_API_TOKEN = "438795e58eda4a47aecc0563fc0d4107"; // replace with your token

export default function SketchfabModal({ isOpen, onClose, onImport }) {
    const [searchTerm, setSearchTerm] = useState("robot");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        fetchModels();
    }, [isOpen]);

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
            const downloadRes = await fetch(`https://api.sketchfab.com/v3/models/${model.uid}/download`, {
                headers: {
                    Authorization: `Token ${SKETCHFAB_API_TOKEN}`,
                },
            });
            const downloadData = await downloadRes.json();
            const zipUrl = downloadData.gltf.url;

            const zipBlob = await fetch(zipUrl).then((res) => res.blob());
            const zip = await JSZip.loadAsync(zipBlob);

            const gltfFileName = Object.keys(zip.files).find((name) => name.endsWith('.gltf'));
            if (!gltfFileName) throw new Error('No .gltf file found in ZIP');

            const fileMap = {};
            await Promise.all(
                Object.keys(zip.files).map(async (filename) => {
                    const blob = await zip.files[filename].async('blob');
                    const url = URL.createObjectURL(blob);
                    fileMap[filename] = url;
                })
            );

            const manager = new LoadingManager();
            manager.setURLModifier((url) => {
                const cleanUrl = url.replace(/^\.\//, '');
                return fileMap[cleanUrl] || url;
            });

            const loader = new GLTFLoader(manager);
            const gltf = await loader.loadAsync(fileMap[gltfFileName]);

            const item = {
                id: Date.now().toString(),
                name: model.name,
                type: 'model',
                url: fileMap[gltfFileName],
                animations: gltf.animations.map((clip) => clip.name),
                selectedAnimationIndex: 0,
                transform: {
                    x: 0, y: 0, z: 0,
                    rx: 0, ry: 0, rz: 0,
                    sx: 1, sy: 1, sz: 1,
                },
            };

            if (onImport) onImport(item);
            onClose();
        } catch (err) {
            console.error("Failed to import Sketchfab model:", err);
            alert("This model could not be downloaded or parsed.");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white w-[600px] max-h-[80vh] overflow-y-auto rounded-lg shadow-xl p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Sketchfab Models</h2>
                    <button onClick={onClose} className="text-red-600 text-lg font-bold">×</button>
                </div>

                <form onSubmit={handleSearch} className="flex mb-4 gap-2">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-1 border px-3 py-1 rounded"
                        placeholder="Search models..."
                    />
                    <button type="submit" className="bg-blue-600 text-white px-4 py-1 rounded">Search</button>
                </form>

                {loading && <p>Loading...</p>}

                <div className="grid grid-cols-2 gap-4">
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
        </div>
    );
}
