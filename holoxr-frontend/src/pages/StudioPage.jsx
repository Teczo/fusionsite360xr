import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import TopBar from '../components/TopBar';
import PropertyPanel from '../components/PropertyPanel';
import SceneCanvasR3F from '../components/SceneCanvasR3F';
import LayersPanel from '../components/LayersPanel';
import LibraryModal from '../components/LibraryModal';
import { useEffect } from 'react';

export default function StudioPage() {
    const location = useLocation();
    const projectId = new URLSearchParams(location.search).get('id');

    const [sceneModels, setSceneModels] = useState([]);
    const [selectedModelId, setSelectedModelId] = useState(null);
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    const [isPreviewing, setIsPreviewing] = useState(false);

    const updateModelTransform = (id, newData) => {
        setSceneModels((prev) =>
            prev.map((model) =>
                model.id === id
                    ? {
                        ...model,
                        transform: { ...model.transform, ...newData },
                        ...(model.type === 'text' && newData.content ? { content: newData.content } : {}),
                    }
                    : model
            )
        );
    };

    const updateTextProperty = (id, updates) => {
        setSceneModels((prev) =>
            prev.map((model) =>
                model.id === id && model.type === 'text'
                    ? { ...model, ...updates }
                    : model
            )
        );
    };

    const handleLibraryItemSelect = (item) => {
        const id = Date.now().toString();
        setSceneModels((prev) => [
            ...prev,
            {
                id,
                name: item.name,
                type: item.type,
                url: item.url || null,
                content: item.content || '',
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
            const res = await fetch(`http://localhost:4000/api/projects/${projectId}`, {
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
            const res = await fetch(`http://localhost:4000/api/projects/${projectId}/publish`, {
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

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!projectId || !token) return;

        const loadProject = async () => {
            try {
                const res = await fetch(`http://localhost:4000/api/projects/${projectId}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                const data = await res.json();
                if (res.ok && data.scene) {
                    setSceneModels(data.scene);
                } else {
                    console.warn('No scene data found for this project.');
                }
            } catch (err) {
                console.error('Failed to load project', err);
            }
        };

        loadProject();
    }, [projectId]);

    return (
        <div className="h-screen flex flex-col">
            {!isPreviewing && (
                <TopBar
                    onLibraryOpen={() => setIsLibraryOpen(true)}
                    onTogglePreview={() => setIsPreviewing((prev) => !prev)}
                    isPreviewing={isPreviewing}
                    onSaveProject={handleSaveProject}
                    onPublishProject={handlePublishProject}
                />


            )}

            <div className="flex flex-1">
                {!isPreviewing && (
                    <div className="flex-1 border-r">
                        <PropertyPanel
                            model={selectedModel}
                            updateModelTransform={updateModelTransform}
                            updateTextProperty={updateTextProperty}
                        />
                    </div>
                )}

                <div className={`${isPreviewing ? 'flex-[6]' : 'flex-[4]'} border-x`}>
                    <SceneCanvasR3F
                        items={sceneModels}
                        selectedModelId={selectedModelId}
                        setSelectedModelId={setSelectedModelId}
                        updateModelTransform={updateModelTransform}
                    />
                </div>

                {!isPreviewing && (
                    <div className="flex-1 border-l">
                        <LayersPanel
                            models={sceneModels}
                            selectedModelId={selectedModelId}
                            setSelectedModelId={setSelectedModelId}
                            onDeleteModel={(id) => {
                                setSceneModels((prev) => prev.filter((model) => model.id !== id));
                                if (selectedModelId === id) setSelectedModelId(null);
                            }}
                        />
                    </div>
                )}
            </div>

            <LibraryModal
                isOpen={isLibraryOpen}
                onClose={() => setIsLibraryOpen(false)}
                onSelectItem={handleLibraryItemSelect}
            />
        </div>
    );
}
