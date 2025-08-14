// StudioPage.jsx — updated to render Images & Text and include their properties on Save/Publish
import { useEffect, useState, useRef } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { Grid, OrbitControls, TransformControls } from "@react-three/drei";
import * as THREE from "three";
import { unzipSync } from "fflate";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

import PropertyPanel from "../panels/PropertyPanel";
import FloatingPanel from "../panels/FloatingPanel";
import TopBar from "../panels/TopBar";
import LibraryModal from "../LibraryModal";
import QRCodeModal from "../QRCodeModal";
import LayersPanel from "../panels/LayersPanel";
import UIButton3D from "../Items/UIButton3D";

// NEW: renderers for non-GLTF items
import ImagePlane from "../Items/ImagePlane";
import TextItem from "../Items/TextItem";

import { BoxHelper } from "three";
import { useLocation } from "react-router-dom";
import toast from 'react-hot-toast';

export default function StudioPage() {
    const [sceneModels, setSceneModels] = useState([]);
    const [selectedModelId, setSelectedModelId] = useState(null);
    const [transformMode, setTransformMode] = useState("translate");
    const [resetSignal, setResetSignal] = useState(0);
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    const location = useLocation();
    const projectId = new URLSearchParams(location.search).get("id");
    const orbitRef = useRef();
    const [projectName, setProjectName] = useState("");
    const [showQRModal, setShowQRModal] = useState(false);
    const [isPreviewing, setIsPreviewing] = useState(false);

    // capture camera for focus-on-double-click for Image/Text
    const cameraRef = useRef(null);

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
                    setProjectName(data.name || "Untitled Project");
                }
            } catch (err) {
                console.error("Failed to load project scene:", err);
            }
        };

        loadProject();
    }, [projectId]);

    // Load GLB/ZIP for model items (images/text skip this)
    useEffect(() => {
        sceneModels.forEach((model) => {
            if (model.type !== "model") return; // only models need scene loading
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

    const updateModelProps = (id, updatesOrFn) => {
        setSceneModels(prev => prev.map(m => {
            if (m.id !== id) return m;
            const updates = typeof updatesOrFn === 'function' ? updatesOrFn(m) : updatesOrFn;
            const merged = { ...m, ...updates };
            if (updates.appearance) {
                merged.appearance = { ...(m.appearance || {}), ...updates.appearance };
            }
            if (updates.interactions !== undefined) {
                merged.interactions = updates.interactions;
            }
            return merged;
        }));
    };


    // inside StudioPage
    const runButtonActions = (buttonItem) => {
        // MVP: support [{ type: 'toggleVisibility', targetId: '...' }, ...]
        const actions = buttonItem.interactions || [];
        actions.forEach((act) => {
            if (act.type === 'toggleVisibility' && act.targetId) {
                setSceneModels(prev => prev.map(obj => (
                    obj.id === act.targetId ? { ...obj, visible: obj.visible === false ? true : false } : obj
                )));
            }
            if (act.type === 'playPauseAnimation' && act.targetId) {
                setSceneModels(prev => prev.map(obj => {
                    if (obj.id !== act.targetId) return obj;
                    const nextPaused = act.mode === 'pause' ? true :
                        act.mode === 'play' ? false :
                            !obj.isPaused;
                    return { ...obj, isPaused: nextPaused };
                }));
            }
            if (act.type === 'changeProject' && act.projectId) {
                // In Studio preview, prevent navigation; show a hint.
                toast(`(Preview) Would load project: ${act.projectId}`);
            }
        });
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
                id,
                name,
                type,
                url,
                transform,
                autoplay,
                isPaused,
                selectedAnimationIndex,
                content, fontSize, color, visible, uiKind, appearance, interactions
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
                content,
                fontSize,
                color,
                visible, uiKind, appearance, interactions
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
                toast.error(data.error || "Failed to publish project");
                return;
            }

            setShowQRModal(true); // show QR code modal
        } catch (err) {
            console.error(err);
            toast.error("Network error while publishing");
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
                x: 0,
                y: 0,
                z: 0,
                rx: 0,
                ry: 0,
                rz: 0,
                sx: 1,
                sy: 1,
                sz: 1,
            },
        };

        // default props for text
        if (item.type === "text") {
            newModel.content = item.content ?? "Hello World";
            newModel.fontSize = item.fontSize ?? 1;
            newModel.color = item.color ?? "#ffffff";
        }

        if (item.type === "model") {
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
        } else {
            // image/text: nothing to load here
            setSceneModels((prev) => [...prev, newModel]);
            setSelectedModelId(id);
        }
    };

    const handleSaveProject = async () => {
        if (!projectId || !sceneModels.length) return;
        const token = localStorage.getItem("token");

        const cleanScene = sceneModels.map((model) => {
            const {
                id,
                name,
                type,
                url,
                transform,
                autoplay,
                isPaused,
                selectedAnimationIndex,
                content, fontSize, color,
                visible, uiKind, appearance, interactions,
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
                content, fontSize, color,
                visible, uiKind, appearance, interactions,
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

            toast.success("Scene saved successfully!");

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
                onTogglePreview={() => setIsPreviewing(v => !v)}
                isPreviewing={isPreviewing}
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
                style={{ background: "#0a0c0d" }}
            >
                <ambientLight intensity={0.5} />
                <directionalLight position={[5, 5, 5]} intensity={1} />
                {/* Attach ref so TransformControls can disable/enable */}
                <OrbitControls ref={orbitRef} makeDefault />
                <CameraController resetSignal={resetSignal} />
                <CaptureCamera cameraRef={cameraRef} />
                <Grid
                    args={[10, 10]}
                    cellSize={0.5}
                    cellThickness={0.5}
                    sectionSize={5}
                    sectionThickness={1.5}
                    sectionColor={"#6f6f6f"}
                    cellColor={"#444"}
                    fadeDistance={30}
                    fadeStrength={1}
                    infiniteGrid={true}
                />

                {/* Render models, images, and text */}
                {sceneModels.map((item) => {
                    if (item.visible === false) return null;
                    if (item.type === "model" && item.scene) {
                        return (
                            <ModelWithAnimation
                                key={item.id}
                                scene={item.scene}
                                animations={item.animations}
                                selectedAnimationIndex={item.selectedAnimationIndex}
                                playAnimationKey={item.playAnimationKey}
                                isPaused={item.isPaused}
                                transformMode={transformMode}
                                isSelected={item.id === selectedModelId}
                                transform={item.transform}
                                orbitRef={orbitRef}
                                onTransformEnd={(obj) => {
                                    updateModelTransform(item.id, {
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
                        );
                    }

                    if (item.type === "image") {
                        return (
                            <ImagePlane
                                key={item.id}
                                id={item.id}
                                name={item.name}
                                url={item.url}
                                transform={item.transform}
                                selectedModelId={selectedModelId}
                                setSelectedModelId={setSelectedModelId}
                                transformMode={transformMode}
                                updateModelTransform={updateModelTransform}
                                handleFocusObject={handleFocusOnObject(cameraRef)}
                            />
                        );
                    }

                    if (item.type === "text") {
                        return (
                            <TextItem
                                key={item.id}
                                id={item.id}
                                name={item.name}
                                content={item.content}
                                fontSize={item.fontSize}
                                color={item.color}
                                transform={item.transform}
                                selectedModelId={selectedModelId}
                                setSelectedModelId={setSelectedModelId}
                                transformMode={transformMode}
                                updateModelTransform={updateModelTransform}
                                handleFocusObject={handleFocusOnObject(cameraRef)}
                            />
                        );
                    }

                    if (item.type === "button") {
                        return (
                            <UIButton3D
                                key={item.id}
                                id={item.id}
                                name={item.name}
                                appearance={item.appearance}
                                transform={item.transform}
                                selectedModelId={selectedModelId}
                                setSelectedModelId={setSelectedModelId}
                                transformMode={transformMode}
                                updateModelTransform={updateModelTransform}
                                isPreviewing={isPreviewing}
                                onPress={() => runButtonActions(item)}
                            />
                        );
                    }

                    return null;
                })}
            </Canvas>

            <PropertyPanel
                model={selectedModel}
                models={sceneModels}
                updateModelTransform={updateModelTransform}
                updateTextProperty={updateTextProperty}
                onPlayAnimation={(id) => updateModelTransform(id, { playAnimationKey: Date.now() })}
                updateModelProps={updateModelProps}
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

// Capture the active R3F camera for focusing utilities
function CaptureCamera({ cameraRef }) {
    const { camera } = useThree();
    useEffect(() => {
        cameraRef.current = camera;
    }, [camera]);
    return null;
}

// Returns a focus handler bound to a cameraRef
function handleFocusOnObject(cameraRef) {
    return (ref) => {
        if (!ref?.current || !cameraRef.current) return;
        const object = ref.current;

        const bbox = new THREE.Box3().setFromObject(object);
        const center = new THREE.Vector3();
        bbox.getCenter(center);

        const size = new THREE.Vector3();
        bbox.getSize(size);
        const offset = Math.max(size.x, size.y, size.z) * 2;

        const direction = new THREE.Vector3(0, 0, 1);
        const newPosition = center.clone().add(direction.multiplyScalar(offset));

        cameraRef.current.position.copy(newPosition);
        cameraRef.current.lookAt(center);
    };
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
