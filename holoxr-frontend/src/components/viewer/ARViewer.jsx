import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { ARButton } from 'three/examples/jsm/webxr/ARButton';
import UILabel3D from "../Items/UILabel3D";
import Quiz3D from '../Items/Quiz3D';
import { ModelItem, ImageItem, ButtonItem, TextItem } from "./ARViewerComponents";
import { ARGestureControls } from "./ARGestureControls";
import { ARPlacementController } from "./ARPlacement";

function runActions(actions, setSceneData, navigateToProject) {
    (actions || []).forEach((act) => {
        if (act.type === 'toggleVisibility' && act.targetId) {
            setSceneData(prev =>
                prev.map(o => o.id === act.targetId ? { ...o, visible: o.visible === false ? true : false } : o)
            );
        }
        if (act.type === 'playPauseAnimation' && act.targetId) {
            setSceneData(prev => prev.map(o => {
                if (o.id !== act.targetId) return o;
                const nextPaused = act.mode === 'pause' ? true : act.mode === 'play' ? false : !o.isPaused;
                return { ...o, isPaused: nextPaused };
            }));
        }
        if (act.type === 'changeProject' && act.projectId) {
            navigateToProject(act.projectId);
        }
        if (act.type === 'openClosePanel' && act.targetId) {
            const mode = act.mode || 'toggle';
            setSceneData(prev => prev.map(o => {
                if (o.id !== act.targetId) return o;
                if (mode === 'show') return { ...o, visible: true };
                if (mode === 'hide') return { ...o, visible: false };
                return { ...o, visible: o.visible === false ? true : false };
            }));
        }
    });
}

export default function ARViewer() {
    const { id } = useParams();
    const [sceneData, setSceneData] = useState([]);
    const [isAR, setIsAR] = useState(false);
    const [placed, setPlaced] = useState(false); // <-- new
    const [loadingScene, setLoadingScene] = useState(false); // optional nice-to-have

    const userGroupRef = useRef();

    // Anchor group: the whole scene is a child of this node, driven by anchor pose
    const anchorGroupRef = useRef();
    const currentAnchorRef = useRef(null); // XRAnchor
    const fallbackPoseMatrixRef = useRef(null); // Float32Array (when anchors unsupported)

    const navigateToProject = (projectId) => {
        window.location.href = `/ar/${projectId}`;
    };

    // Fetch the scene ONLY after the user places the anchor the first time
    useEffect(() => {
        let cancelled = false;
        const fetchScene = async () => {
            if (!placed || !id) return;
            try {
                setLoadingScene(true);
                const res = await fetch(`${import.meta.env.VITE_API_URL}/api/published/${id}`);
                const data = await res.json();
                console.log('📦 AR Scene Data (after placement):', data);
                if (!cancelled && res.ok && data.publishedScene) {
                    setSceneData(data.publishedScene);
                }
            } catch (err) {
                console.error('Failed to load published scene', err);
            } finally {
                setLoadingScene(false);
            }
        };
        fetchScene();
        return () => { cancelled = true; };
    }, [placed, id]);

    // Update anchorGroup from anchor each frame (called by controller)
    const handleAnchorPoseMatrix = useCallback((frame, xrRefSpace) => {
        const group = anchorGroupRef.current;
        if (!group) return;

        // Prefer live anchor tracking
        const anchor = currentAnchorRef.current;
        if (anchor && anchor.anchorSpace) {
            const pose = frame.getPose(anchor.anchorSpace, xrRefSpace);
            if (pose) {
                group.matrix.fromArray(pose.transform.matrix);
                group.matrix.decompose(group.position, group.quaternion, group.scale);
                return;
            }
        }

        // Fallback: apply static placement matrix (no anchors)
        const m = fallbackPoseMatrixRef.current;
        if (m) {
            group.matrix.fromArray(m);
            group.matrix.decompose(group.position, group.quaternion, group.scale);
        }
    }, []);

    // When user taps to place (called by ARPlacementController)
    const handleTapPlace = useCallback(({ anchor, poseMatrix }) => {
        // Clear previous anchor
        if (currentAnchorRef.current) {
            try { currentAnchorRef.current.delete?.(); } catch { }
            currentAnchorRef.current = null;
        }
        fallbackPoseMatrixRef.current = null;

        if (anchor) {
            currentAnchorRef.current = anchor;
            anchor.addEventListener?.('remove', () => {
                if (currentAnchorRef.current === anchor) currentAnchorRef.current = null;
            });
        } else if (poseMatrix) {
            // No anchor support -> store static placement
            fallbackPoseMatrixRef.current = new Float32Array(poseMatrix);
        }

        // Mark as placed (first time triggers the fetch)
        if (!placed) setPlaced(true);
    }, [placed]);

    return (
        <div className="w-screen h-screen touch-none select-none">
            {/* Simple placement / loading UI using DOM overlay */}
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    pointerEvents: 'none',
                    display: isAR ? 'block' : 'none',
                    fontFamily: 'system-ui, sans-serif'
                }}
            >
                {!placed && (
                    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 24, textAlign: 'center' }}>
                        <div
                            style={{
                                display: 'inline-block',
                                background: 'rgba(0,0,0,0.6)',
                                color: '#fff',
                                padding: '10px 14px',
                                borderRadius: 12,
                                pointerEvents: 'auto'
                            }}
                        >
                            Move your phone to find a surface, then tap to place.
                        </div>
                    </div>
                )}
                {placed && loadingScene && (
                    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 24, textAlign: 'center' }}>
                        <div
                            style={{
                                display: 'inline-block',
                                background: 'rgba(0,0,0,0.6)',
                                color: '#fff',
                                padding: '10px 14px',
                                borderRadius: 12
                            }}
                        >
                            Loading scene…
                        </div>
                    </div>
                )}
            </div>

            <Canvas
                camera={{ position: [0, 1.6, 10], fov: 70 }}  // push desktop preview camera back
                onCreated={({ gl }) => {
                    gl.xr.enabled = true;

                    // Prevent browser pinch-to-zoom / scroll on canvas
                    gl.domElement.style.touchAction = 'none';

                    // Prefer floor-aligned coordinates if available
                    try { gl.xr.setReferenceSpaceType?.('local-floor'); } catch { }

                    gl.xr.addEventListener('sessionstart', () => setIsAR(true));
                    gl.xr.addEventListener('sessionend', () => {
                        setIsAR(false);
                        // Reset anchor state on AR exit
                        if (currentAnchorRef.current) {
                            try { currentAnchorRef.current.delete?.(); } catch { }
                            currentAnchorRef.current = null;
                        }
                        fallbackPoseMatrixRef.current = null;
                        // Reset placement state so next AR session asks to place again
                        setPlaced(false);
                        setSceneData([]);
                    });

                    // Create AR button with the right features
                    const button = ARButton.createButton(gl, {
                        requiredFeatures: ['hit-test'],
                        optionalFeatures: ['anchors', 'local-floor', 'dom-overlay'],
                        domOverlay: { root: document.body }
                    });

                    // Avoid adding multiple buttons across HMR or re-mounts
                    const existing = document.querySelector('.webxr-ar-button');
                    if (!existing) {
                        button.classList.add('webxr-ar-button');
                        document.body.appendChild(button);
                    }
                }}
            >
                <ambientLight intensity={0.5} />
                <directionalLight position={[5, 5, 5]} intensity={1} />
                {!isAR && <OrbitControls />}

                {/* AR controller manages reticle + placement + anchor updates */}
                <ARPlacementController
                    enableAR={isAR}
                    onAnchorPoseMatrix={handleAnchorPoseMatrix}
                    onTapPlace={handleTapPlace}
                />

                {/* Anchor-driven root (matrix updated from anchor/pose per frame) */}
                <group ref={anchorGroupRef} matrixAutoUpdate={false}>
                    {/* Only enable gestures and render the scene AFTER placement */}
                    {isAR && placed && (
                        <ARGestureControls
                            enabled={true}
                            targetRef={userGroupRef}
                            minScale={0.1}
                            maxScale={8}
                            rotateSpeed={0.006}
                        />
                    )}

                    <group ref={userGroupRef} visible={placed}>
                        {placed && sceneData.map((item) => {
                            if (item.visible === false) return null;

                            if (item.type === 'model') {
                                return (
                                    <ModelItem
                                        key={item.id}
                                        url={item.url}
                                        transform={item.transform}
                                        selectedAnimationIndex={item.selectedAnimationIndex}
                                        autoplay={item.autoplay}
                                        isPaused={item.isPaused}
                                    />
                                );
                            } else if (item.type === 'image') {
                                return <ImageItem key={item.id} url={item.url} transform={item.transform} />;
                            } else if (item.type === 'text') {
                                return (
                                    <TextItem
                                        key={item.id}
                                        content={item.content}
                                        fontSize={item.fontSize}
                                        color={item.color}
                                        transform={item.transform}
                                    />
                                );
                            } else if (item.type === 'button') {
                                return (
                                    <ButtonItem
                                        key={item.id}
                                        item={item}
                                        onPress={(btn) => runActions(btn.interactions, setSceneData, navigateToProject)}
                                    />
                                );
                            } else if (item.type === 'label') {
                                return (
                                    <UILabel3D
                                        key={item.id}
                                        id={item.id}
                                        name={item.name}
                                        content={item.content}
                                        fontSize={item.fontSize}
                                        color={item.color}
                                        appearance={item.appearance}
                                        transform={item.transform}
                                        lineMode={item.lineMode || 'none'}
                                        targetId={item.targetId || null}
                                        anchorPoint={item.anchorPoint || null}
                                        models={sceneData}
                                        selectedModelId={null}
                                        transformMode="none"
                                        isPreviewing={true}
                                    />
                                );
                            } else if (item.type === 'quiz') {
                                return (
                                    <Quiz3D
                                        key={item.id}
                                        id={item.id}
                                        name={item.name}
                                        quiz={item.quiz}
                                        transform={item.transform}
                                        appearance={item.appearance}
                                        selectedModelId={null}
                                        setSelectedModelId={() => { }}
                                        transformMode="none"
                                        isPreviewing={true}
                                        orbitRef={null}
                                        updateModelTransform={() => { }}
                                    />
                                );
                            }
                            return null;
                        })}
                    </group>
                </group>
            </Canvas>
        </div>
    );
}
