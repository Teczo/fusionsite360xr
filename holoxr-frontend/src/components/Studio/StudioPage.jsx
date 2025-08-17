// StudioPage.jsx — project thumbnails from canvas capture
// - Captures current R3F canvas as WebP on Save/Publish
// - Uploads to /api/projects/:id/thumbnail (PATCH, multipart, field: "thumbnail")

import { useEffect, useState, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { Grid, OrbitControls } from "@react-three/drei";

import PropertyPanel from "../panels/PropertyPanel";
import FloatingPanel from "../panels/FloatingPanel";
import TopBar from "../panels/TopBar";
import LibraryModal from "../LibraryModal";
import QRCodeModal from "../QRCodeModal";
import LayersPanel from "../panels/LayersPanel";
import UIButton3D from "../Items/UIButton3D";
import UILabel3D from "../Items/UILabel3D";

// Non-GLTF renderers
import ImagePlane from "../Items/ImagePlane";
import TextItem from "../Items/TextItem";

import { CameraController, CaptureCamera, handleFocusOnObject, ModelWithAnimation } from "./studioComponents.jsx";

import { useLocation } from "react-router-dom";

import {
    loadProjectData,
    initializeModelLoading,
    handleLibraryItemSelect as addFromLibrary,
    updateModelTransform as updateXform,
    updateModelProps as updateProps,
    updateTextProperty as updateText,
    runButtonActions as runActions,
    handleSaveProject as saveProject,
    handlePublishProject as publishProject,
} from "./studioLogic.jsx";
import Quiz3D from "../Items/Quiz3D.jsx";

// Helper: upload a project thumbnail (WebP) to backend
async function uploadProjectThumbnail(projectId, token, canvasEl) {
    if (!projectId || !token || !canvasEl) return false;

    // Ensure most recent frame has rendered
    await new Promise((r) => requestAnimationFrame(r));

    const blob = await new Promise((resolve) => canvasEl.toBlob(resolve, "image/webp", 0.9));
    if (!blob) throw new Error("Canvas capture failed");

    const fd = new FormData();
    fd.append("thumbnail", blob, "thumb.webp");

    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/projects/${projectId}/thumbnail`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
    });

    if (!res.ok) {
        // Non-fatal for Save/Publish flows; log and continue
        console.warn("Thumbnail upload failed", await res.text());
        return false;
    }

    return true;
}

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
    const [pickingAnchorLabelId, setPickingAnchorLabelId] = useState(null);

    // capture camera for focus-on-double-click for Image/Text
    const cameraRef = useRef(null);

    // Keep a ref to the actual canvas element for thumbnail capture
    const canvasRef = useRef(null);

    // Load project on mount
    useEffect(() => {
        const token = localStorage.getItem("token");
        loadProjectData(projectId, token, setSceneModels, setProjectName);
    }, [projectId]);

    // Load GLB/ZIP for models when scene changes
    useEffect(() => {
        initializeModelLoading(sceneModels, setSceneModels);
    }, [sceneModels]);

    const onUpdateTransform = (id, updates) => updateXform(setSceneModels, id, updates);
    const onUpdateProps = (id, updatesOrFn) => updateProps(setSceneModels, id, updatesOrFn);
    const onUpdateText = (id, updates) => updateText(setSceneModels, id, updates);
    const onRunButtonActions = (buttonItem) => runActions(buttonItem, setSceneModels);
    const startAnchorPick = (labelId) => setPickingAnchorLabelId(labelId);

    const onPublish = async () => {
        const ok = await publishProject(projectId, sceneModels);
        if (ok) {
            // Try to capture & upload project thumbnail
            try {
                const token = localStorage.getItem("token");
                if (canvasRef.current) {
                    await uploadProjectThumbnail(projectId, token, canvasRef.current);
                }
            } catch (err) {
                console.warn("Project thumbnail capture (publish) failed:", err);
            }
            setShowQRModal(true);
        }
    };

    const onSave = async () => {
        const ok = await saveProject(projectId, sceneModels);
        if (ok) {
            // Opportunistic thumbnail refresh on Save
            try {
                const token = localStorage.getItem("token");
                if (canvasRef.current) {
                    await uploadProjectThumbnail(projectId, token, canvasRef.current);
                }
            } catch (err) {
                console.warn("Project thumbnail capture (save) failed:", err);
            }
        }
    };

    const onSelectLibraryItem = (item) => addFromLibrary(item, setSceneModels, setSelectedModelId);

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
                onTogglePreview={() => setIsPreviewing((v) => !v)}
                isPreviewing={isPreviewing}
                onSaveProject={onSave}
                onPublishProject={onPublish}
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
                // Capture the underlying canvas element for thumbnails
                onCreated={({ gl }) => {
                    canvasRef.current = gl.domElement;
                }}
            >
                <ambientLight intensity={0.5} />
                <directionalLight position={[5, 5, 5]} intensity={1} />
                <OrbitControls ref={orbitRef} makeDefault />
                <CameraController resetSignal={resetSignal} />
                <CaptureCamera cameraRef={cameraRef} />
                <Grid
                    args={[10, 10]}
                    cellSize={0.5}
                    cellThickness={0.5}
                    sectionSize={5}
                    sectionThickness={1.5}
                    sectionColor={"#ffffffff"}
                    cellColor={"#444"}
                    fadeDistance={30}
                    fadeStrength={1}
                    infiniteGrid
                />

                {/* Render models, images, text, buttons, labels */}
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
                                    onUpdateTransform(item.id, {
                                        x: obj.position.x, y: obj.position.y, z: obj.position.z,
                                        rx: obj.rotation.x, ry: obj.rotation.y, rz: obj.rotation.z,
                                        sx: obj.scale.x, sy: obj.scale.y, sz: obj.scale.z,
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
                                updateModelTransform={onUpdateTransform}
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
                                updateModelTransform={onUpdateTransform}
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
                                updateModelTransform={onUpdateTransform}
                                isPreviewing={isPreviewing}
                                onPress={() => onRunButtonActions(item)}
                            />
                        );
                    }

                    if (item.type === "label") {
                        return (
                            <UILabel3D
                                key={item.id}
                                id={item.id}
                                name={item.name}
                                content={item.content}
                                fontSize={item.fontSize ?? 0.35}
                                color={item.color ?? "#ffffff"}
                                appearance={item.appearance}
                                transform={item.transform}
                                // NEW: line mode & endpoints
                                lineMode={item.lineMode || "none"}         // 'none' | 'toObject' | 'toPoint'
                                targetId={item.targetId ?? null}
                                anchorPoint={item.anchorPoint ?? null}
                                // Editor props
                                selectedModelId={selectedModelId}
                                setSelectedModelId={setSelectedModelId}
                                transformMode={transformMode}
                                updateModelTransform={onUpdateTransform}
                                models={sceneModels}
                                orbitRef={orbitRef}
                                isPreviewing={isPreviewing}
                            />
                        );
                    }

                    if (item.type === "quiz") {
                        return (
                            <Quiz3D
                                key={item.id}
                                id={item.id}
                                name={item.name}
                                quiz={item.quiz}
                                transform={item.transform}
                                appearance={item.appearance}
                                selectedModelId={selectedModelId}
                                setSelectedModelId={setSelectedModelId}
                                transformMode={transformMode}
                                orbitRef={orbitRef}
                                isPreviewing={isPreviewing}
                                updateModelTransform={onUpdateTransform}
                            />
                        );
                    }

                    return null;
                })}

                {/* PICKING PLANE: render ONCE, not inside the map */}
                {pickingAnchorLabelId && (
                    <mesh
                        rotation={[-Math.PI / 2, 0, 0]}
                        position={[0, 0, 0]}
                        onPointerDown={(e) => {
                            e.stopPropagation();
                            const hit = e.point; // world coords on the plane
                            setSceneModels((prev) =>
                                prev.map((m) =>
                                    m.id === pickingAnchorLabelId
                                        ? {
                                            ...m,
                                            lineMode: "toPoint",
                                            anchorPoint: { x: hit.x, y: hit.y, z: hit.z },
                                        }
                                        : m
                                )
                            );
                            setPickingAnchorLabelId(null);
                        }}
                    >
                        <planeGeometry args={[1000, 1000, 1, 1]} />
                        <meshBasicMaterial transparent opacity={0.0} depthWrite={false} />
                    </mesh>
                )}
            </Canvas>

            <PropertyPanel
                model={selectedModel}
                models={sceneModels}
                updateModelTransform={onUpdateTransform}
                updateTextProperty={onUpdateText}
                onPlayAnimation={(id) => onUpdateTransform(id, { playAnimationKey: Date.now() })}
                updateModelProps={onUpdateProps}
                onStartAnchorPick={startAnchorPick}
            />

            <LibraryModal
                isOpen={isLibraryOpen}
                onClose={() => setIsLibraryOpen(false)}
                onSelectItem={onSelectLibraryItem}
            />
        </div>
    );
}
