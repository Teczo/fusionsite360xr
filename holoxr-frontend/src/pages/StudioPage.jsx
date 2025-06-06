import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';
import PropertyPanel from '../components/PropertyPanel';
import SceneCanvasR3F from '../components/SceneCanvasR3F';
import LayersPanel from '../components/LayersPanel';
import LibraryModal from '../components/LibraryModal';
import QRCodeModal from '../components/QRCodeModal';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import LoadingScreen from '../components/LoadingScreen';

export default function StudioPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const projectId = new URLSearchParams(location.search).get('id');

    const [sceneModels, setSceneModels] = useState([]);
    const [selectedModelId, setSelectedModelId] = useState(null);
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    const [isPreviewing, setIsPreviewing] = useState(false);
    const [projectName, setProjectName] = useState('');
    const [showQRModal, setShowQRModal] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const updateModelTransform = (id, newData) => {
        setSceneModels((prev) =>
            prev.map((model) =>
                model.id === id
                    ? {
                        ...model,
                        transform: { ...model.transform, ...newData },
                        ...(model.type === 'text' && newData.content ? { content: newData.content } : {}),
                        ...(typeof newData.selectedAnimationIndex !== 'undefined' && { selectedAnimationIndex: newData.selectedAnimationIndex }),
                        ...(typeof newData.playAnimationKey !== 'undefined' && { playAnimationKey: newData.playAnimationKey }),
                        ...(typeof newData.autoplay !== 'undefined' && { autoplay: newData.autoplay }),
                    }
                    : model
            )
        );
    };

    const updateTextProperty = (id, updates) => {
        setSceneModels((prev) =>
            prev.map((model) =>
                model.id === id && model.type === 'text' ? { ...model, ...updates } : model
            )
        );
    };

    const handleLibraryItemSelect = async (item) => {
        const id = Date.now().toString();
        let animations = [];

        if (item.type === 'model') {
            try {
                const gltf = await new GLTFLoader().loadAsync(item.url);
                animations = gltf.animations.map((clip) => clip.name);
            } catch (err) {
                console.error('Failed to load animations for model:', err);
            }
        }

        setSceneModels((prev) => [
            ...prev,
            {
                id,
                name: item.name,
                type: item.type,
                url: item.url || null,
                content: item.content || '',
                animations,
                selectedAnimationIndex: 0,
                playAnimationKey: Date.now(),
                transform: {
                    x: 0, y: 0, z: 0,
                    rx: 0, ry: 0, rz: 0,
                    sx: 1, sy: 1, sz: 1,
                },
            },
        ]);

        setIsLibraryOpen(false);
    };

    const handleSaveProject = async () => {
        if (!projectId || !sceneModels.length) return;
        const token = localStorage.getItem('token');

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/projects/${projectId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ scene: sceneModels }),
            });

            const data = await res.json();
            if (!res.ok) {
                alert(data.error || 'Failed to save project');
                return;
            }

            alert('✅ Scene saved successfully!');
        } catch (err) {
            console.error(err);
            alert('Network error while saving scene');
        }
    };

    const handlePublishProject = async () => {
        if (!projectId || !sceneModels.length) return;
        const token = localStorage.getItem('token');

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/projects/${projectId}/publish`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ scene: sceneModels }),
            });

            const data = await res.json();
            if (!res.ok) {
                alert(data.error || 'Failed to publish project');
                return;
            }

            const fullUrl = `${window.location.origin}${data.shareUrl}`;
            alert(`✅ Published! Share this AR link:\n\n${fullUrl}`);
        } catch (err) {
            console.error(err);
            alert('Network error while publishing');
        }
    };

    const selectedModel = sceneModels.find((m) => m.id === selectedModelId);
    const handlePlayAnimation = (id) => {
        updateModelTransform(id, { playAnimationKey: Date.now() });
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!projectId || !token) return;

        const loadProject = async () => {
            setIsLoading(true);
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/api/projects/${projectId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                const data = await res.json();
                if (res.ok) {
                    setSceneModels(data.scene || []);
                    setProjectName(data.name || 'Untitled Project');
                }
            } catch (err) {
                console.error('Failed to load project', err);
            } finally {
                setIsLoading(false);
            }
        };

        loadProject();
    }, [projectId]);

    if (isLoading) {
        return <LoadingScreen message="Loading your project..." />;
    }

    return (
        <div className="relative w-full h-screen overflow-hidden">
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-100 z-0" />

            {/* Floating TopBar */}
            {!isPreviewing && (
                <TopBar
                    onLibraryOpen={() => setIsLibraryOpen(true)}
                    onTogglePreview={() => setIsPreviewing((prev) => !prev)}
                    isPreviewing={isPreviewing}
                    onSaveProject={handleSaveProject}
                    onPublishProject={handlePublishProject}
                    projectName={projectName}
                    onBack={() => navigate('/dashboard')}
                    onShowQRCode={() => setShowQRModal(true)}
                />
            )}

            {/* QR Modal */}
            <QRCodeModal
                isOpen={showQRModal}
                onClose={() => setShowQRModal(false)}
                url={`https://holoxr.onrender.com/ar/${projectId}`}
                projectTitle={projectName}
            />

            {/* Panels & Canvas */}
            <LayersPanel
                models={sceneModels}
                selectedModelId={selectedModelId}
                setSelectedModelId={setSelectedModelId}
                onDeleteModel={(id) => {
                    setSceneModels((prev) => prev.filter((model) => model.id !== id));
                    if (selectedModelId === id) setSelectedModelId(null);
                }}
            />

            <PropertyPanel
                model={selectedModel}
                updateModelTransform={updateModelTransform}
                updateTextProperty={updateTextProperty}
                onPlayAnimation={handlePlayAnimation}
            />

            <div className="absolute inset-0 z-0">
                <SceneCanvasR3F
                    items={sceneModels}
                    selectedModelId={selectedModelId}
                    setSelectedModelId={setSelectedModelId}
                    updateModelTransform={updateModelTransform}
                    onPlayAnimation={handlePlayAnimation}
                />
            </div>

            <LibraryModal
                isOpen={isLibraryOpen}
                onClose={() => setIsLibraryOpen(false)}
                onSelectItem={handleLibraryItemSelect}
            />
        </div>
    );
}
