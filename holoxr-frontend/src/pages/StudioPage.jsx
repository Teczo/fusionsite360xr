// StudioPage.jsx (with OrbitControls lock when using TransformControls)
import { useEffect, useState, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Grid, OrbitControls, TransformControls } from "@react-three/drei";
import * as THREE from "three";
import { unzipSync } from "fflate";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import PropertyPanel from "../components/PropertyPanel";
import FloatingPanel from "../components/FloatingPanel";
import TopBar from "../components/TopBar";
import LibraryModal from "../components/LibraryModal";
import QRCodeModal from '../components/QRCodeModal';
import LayersPanel from "../components/LayersPanel";
import { MeshBasicMaterial, BoxHelper } from "three";
import { useLocation } from "react-router-dom";

export default function StudioPage() {
    const [sceneModels, setSceneModels] = useState([]);
    const [selectedModelId, setSelectedModelId] = useState(null);
    const [transformMode, setTransformMode] = useState("translate");
    const [resetSignal, setResetSignal] = useState(0);
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    const location = useLocation();
    const projectId = new URLSearchParams(location.search).get("id");
    const orbitRef = useRef();
    const [projectName, setProjectName] = useState('');
    const [showQRModal, setShowQRModal] = useState(false);


    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!projectId || !token) return;

        const loadProject = async () => {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/api/projects/${projectId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await res.json();
                if (res.ok && data.scene) {
                    setSceneModels(data.scene);
                    setProjectName(data.name || 'Untitled Project');
                }
            } catch (err) {
                console.error("Failed to load project scene:", err);
            }
        };

        loadProject();
    }, [projectId]);

    useEffect(() => {
        sceneModels.forEach((model) => {
            if (!model.scene && model.url) {
                if (model.url.endsWith(".zip")) {
                    fetch(model.url)
                        .then((res) => res.arrayBuffer())
                        .then((buffer) => {
                            const zip = unzipSync(new Uint8Array(buffer));
                            const glbName = Object.keys(zip).find((n) => n.endsWith(".glb"));
                            if (!glbName) return;

                            const blob = new Blob([zip[glbName]], { type: "model/gltf-binary" });
                            const blobUrl = URL.createObjectURL(blob);

                            const loader = new GLTFLoader();
                            loader.load(blobUrl, (gltf) => {
                                setSceneModels((prev) =>
                                    prev.map((m) =>
                                        m.id === model.id
                                            ? {
                                                ...m,
                                                scene: gltf.scene,
                                                animations: gltf.animations || [],
                                                playAnimationKey: Date.now(),
                                            }
                                            : m
                                    )
                                );
                            });
                        });
                } else {
                    const loader = new GLTFLoader();
                    loader.load(model.url, (gltf) => {
                        setSceneModels((prev) =>
                            prev.map((m) =>
                                m.id === model.id
                                    ? {
                                        ...m,
                                        scene: gltf.scene,
                                        animations: gltf.animations || [],
                                        playAnimationKey: Date.now(),
                                    }
                                    : m
                            )
                        );
                    });
                }
            }
        });
    }, [sceneModels]);

    const updateModelTransform = (id, updates) => {
        setSceneModels((prev) =>
            prev.map((model) =>
                model.id === id
                    ? {
                        ...model,
                        transform: { ...model.transform, ...updates },
                        ...(typeof updates.selectedAnimationIndex !== "undefined" && {
                            selectedAnimationIndex: updates.selectedAnimationIndex,
                        }),
                        ...(typeof updates.playAnimationKey !== "undefined" && {
                            playAnimationKey: updates.playAnimationKey,
                        }),
                        ...(typeof updates.isPaused !== "undefined" && {
                            isPaused: updates.isPaused,
                        }),
                        ...(typeof updates.autoplay !== "undefined" && {
                            autoplay: updates.autoplay,
                        }),
                    }
                    : model
            )
        );
    };

    const updateTextProperty = (id, updates) => {
        setSceneModels((prev) =>
            prev.map((model) => (model.id === id && model.type === "text" ? { ...model, ...updates } : model))
        );
    };

    const handlePublishProject = async () => {
        if (!projectId || !sceneModels.length) return;
        const token = localStorage.getItem("token");

        const cleanScene = sceneModels.map((model) => {
            const {
                id, name, type, url, transform,
                autoplay, isPaused, selectedAnimationIndex,
            } = model;

            return {
                id, name, type, url, transform, autoplay, isPaused, selectedAnimationIndex
            };
        });

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/projects/${projectId}/publish`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ scene: cleanScene }),
            });

            const data = await res.json();
            if (!res.ok) {
                alert(data.error || "Failed to publish project");
                return;
            }

            setShowQRModal(true); // ✅ show the QR code modal
        } catch (err) {
            console.error(err);
            alert("Network error while publishing");
        }
    };


    const handleLibraryItemSelect = (item) => {
        const id = Date.now().toString();
        const newModel = {
            id,
            name: item.name,
            type: item.type,
            url: item.url,
            scene: null,
            animations: [],
            selectedAnimationIndex: 0,
            playAnimationKey: Date.now(),
            isPaused: false,
            autoplay: false,
            transform: item.transform || {
                x: 0, y: 0, z: 0,
                rx: 0, ry: 0, rz: 0,
                sx: 1, sy: 1, sz: 1,
            },
        };

        if (item.url?.endsWith(".zip")) {
            fetch(item.url)
                .then((res) => res.arrayBuffer())
                .then((buffer) => {
                    const zip = unzipSync(new Uint8Array(buffer));
                    const glbName = Object.keys(zip).find((n) => n.endsWith(".glb"));
                    if (!glbName) return;

                    const blob = new Blob([zip[glbName]], { type: "model/gltf-binary" });
                    const blobUrl = URL.createObjectURL(blob);

                    const loader = new GLTFLoader();
                    loader.load(blobUrl, (gltf) => {
                        newModel.scene = gltf.scene;
                        newModel.animations = gltf.animations || [];
                        setSceneModels((prev) => [...prev, newModel]);
                        setSelectedModelId(id);
                    });
                });
        } else {
            const loader = new GLTFLoader();
            loader.load(item.url, (gltf) => {
                newModel.scene = gltf.scene;
                newModel.animations = gltf.animations || [];
                setSceneModels((prev) => [...prev, newModel]);
                setSelectedModelId(id);
            });
        }
    };

    const handleSaveProject = async () => {
        if (!projectId || !sceneModels.length) return;
        const token = localStorage.getItem("token");

        const cleanScene = sceneModels.map((model) => {
            const {
                id, name, type, url, transform,
                autoplay, isPaused, selectedAnimationIndex,
            } = model;

            return {
                id,
                name,
                type,
                url,
                transform,
                autoplay,
                isPaused,
                selectedAnimationIndex,
            };
        });

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/projects/${projectId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ scene: cleanScene }),
            });

            const data = await res.json();
            if (!res.ok) {
                alert(data.error || "Failed to save project");
                return;
            }

            alert("✅ Scene saved successfully!");
        } catch (err) {
            console.error(err);
            alert("Network error while saving");
        }
    };

    const selectedModel = sceneModels.find((m) => m.id === selectedModelId);

    return (
        <div className="flex h-screen bg-[#121212] text-white">
            <FloatingPanel
                transformMode={transformMode}
                setTransformMode={setTransformMode}
                onResetView={() => setResetSignal((prev) => prev + 1)}
            />

            <TopBar
                onLibraryOpen={() => setIsLibraryOpen(true)}
                onTogglePreview={() => { }}
                isPreviewing={false}
                onSaveProject={handleSaveProject}
                onPublishProject={handlePublishProject}
                onShowQRCode={() => setShowQRModal(true)}
                onBack={() => window.history.back()}
                projectName={projectName}
            />

            <QRCodeModal
                isOpen={showQRModal}
                onClose={() => setShowQRModal(false)}
                url={`https://holoxr.onrender.com/ar/${projectId}`}
                projectTitle={projectName || "Untitled Project"}
            />


            <LayersPanel
                models={sceneModels}
                selectedModelId={selectedModelId}
                setSelectedModelId={setSelectedModelId}
                onDeleteModel={(id) => {
                    setSceneModels((prev) => prev.filter((m) => m.id !== id));
                    if (selectedModelId === id) setSelectedModelId(null);
                }}
            />

            <Canvas
                camera={{ position: [0, 2, 10], fov: 60 }}
                shadows
                dpr={[1, 2]}
                gl={{ preserveDrawingBuffer: true }}
                style={{ background: '#0a0c0d' }}
            >
                <ambientLight intensity={0.5} />
                <directionalLight position={[5, 5, 5]} intensity={1} />
                <OrbitControls makeDefault />
                <CameraController resetSignal={resetSignal} />
                <Grid
                    args={[10, 10]}
                    cellSize={0.5}
                    cellThickness={0.5}
                    sectionSize={5}
                    sectionThickness={1.5}
                    sectionColor={'#6f6f6f'}
                    cellColor={'#444'}
                    fadeDistance={30}
                    fadeStrength={1}
                    infiniteGrid={true}
                />

                {sceneModels.map((model) =>
                    model.scene ? (
                        <ModelWithAnimation
                            key={model.id}
                            scene={model.scene}
                            animations={model.animations}
                            selectedAnimationIndex={model.selectedAnimationIndex}
                            playAnimationKey={model.playAnimationKey}
                            isPaused={model.isPaused}
                            transformMode={transformMode}
                            isSelected={model.id === selectedModelId}
                            transform={model.transform}
                            orbitRef={orbitRef}
                            onTransformEnd={(obj) => {
                                updateModelTransform(model.id, {
                                    x: obj.position.x,
                                    y: obj.position.y,
                                    z: obj.position.z,
                                    rx: obj.rotation.x,
                                    ry: obj.rotation.y,
                                    rz: obj.rotation.z,
                                    sx: obj.scale.x,
                                    sy: obj.scale.y,
                                    sz: obj.scale.z,
                                });
                            }}
                        />
                    ) : null
                )}
            </Canvas>

            <PropertyPanel
                model={selectedModel}
                updateModelTransform={updateModelTransform}
                updateTextProperty={updateTextProperty}
                onPlayAnimation={(id) =>
                    updateModelTransform(id, { playAnimationKey: Date.now() })
                }
            />

            <LibraryModal
                isOpen={isLibraryOpen}
                onClose={() => setIsLibraryOpen(false)}
                onSelectItem={handleLibraryItemSelect}
            />
        </div>
    );
}

function CameraController({ resetSignal }) {
    const { camera } = useThree();
    const resetRef = useRef(resetSignal);

    useEffect(() => {
        if (resetSignal !== resetRef.current) {
            camera.position.set(0, 2, 6);
            camera.lookAt(0, 0, 0);
            resetRef.current = resetSignal;
        }
    }, [resetSignal]);

    return null;
}

function ModelWithAnimation({
    scene,
    animations,
    selectedAnimationIndex,
    playAnimationKey,
    isPaused,
    transformMode,
    onTransformEnd,
    isSelected,
    transform,
    orbitRef,
}) {
    const ref = useRef();
    const mixerRef = useRef();

    useEffect(() => {
        if (!scene || animations.length === 0) return;

        const mixer = new THREE.AnimationMixer(scene);
        mixerRef.current = mixer;

        const clip = animations[selectedAnimationIndex];
        const action = mixer.clipAction(clip);
        action.reset().play();

        return () => mixer.stopAllAction();
    }, [scene, animations, selectedAnimationIndex, playAnimationKey]);

    useFrame((_, delta) => {
        if (!isPaused) mixerRef.current?.update(delta);
    });

    useEffect(() => {
        if (!scene) return;
        scene.position.set(transform.x, transform.y, transform.z);
        scene.rotation.set(transform.rx, transform.ry, transform.rz);
        scene.scale.set(transform.sx, transform.sy, transform.sz);
    }, [scene, transform]);

    return (
        <>
            <primitive ref={ref} object={scene} />
            {isSelected && ref.current && (
                <primitive object={new BoxHelper(ref.current, new THREE.Color("skyblue"))} />
            )}
            {isSelected && transformMode !== "none" && (
                <TransformControls
                    object={ref.current}
                    mode={transformMode}
                    onMouseDown={() => {
                        if (orbitRef.current) orbitRef.current.enabled = false;
                    }}
                    onMouseUp={() => {
                        if (orbitRef.current) orbitRef.current.enabled = true;
                        if (!ref.current || !onTransformEnd) return;
                        onTransformEnd(ref.current);
                    }}
                />
            )}
        </>
    );
}
