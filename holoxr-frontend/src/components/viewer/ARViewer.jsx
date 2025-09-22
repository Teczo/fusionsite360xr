import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { ARButton } from 'three/examples/jsm/webxr/ARButton';
import UILabel3D from "../Items/UILabel3D";
import Quiz3D from '../Items/Quiz3D';
import { ModelItem, ImageItem, ButtonItem, TextItem, IfcItem } from "./ARViewerComponents";
import { ARGestureControls } from "./ARGestureControls";
import { ARPlacementController } from "./ARPlacement";
import useAnalytics from "../hooks/useAnalytics";
import * as THREE from "three";

function runActions(actions, setSceneData, navigateToProject, track, navigateToScene) {
    (actions || []).forEach((act) => {
        // optional: high-level event per action
        track?.("button_action", {
            actionType: act.type,
            targetId: act.targetId || null,
            projectId: act.projectId || null
        });

        if (act.type === 'toggleVisibility' && act.targetId) {
            setSceneData(prev =>
                prev.map(o => o.id === act.targetId ? { ...o, visible: o.visible === false ? true : false } : o)
            );
        }
        if (act.type === 'playPauseAnimation' && act.targetId) {
            setSceneData(prev => prev.map(o => {
                if (o.id !== act.targetId) return o;
                const nextPaused = act.mode === 'pause' ? true : act.mode === 'play' ? false : !o.isPaused;
                // optional: specific animation event
                track?.("animation_toggle", { targetId: o.id, paused: nextPaused });
                return { ...o, isPaused: nextPaused };
            }));
        }
        if (act.type === 'changeProject' && act.projectId) {
            track?.("navigate_project", { toProjectId: act.projectId });
            navigateToProject(act.projectId);
        }
        if (act.type === 'NAVIGATE_SCENE' && act.projectId) {
            track?.("navigate_scene", {
                toProjectId: act.projectId,
                toSceneId: act.sceneId || null
            });
            navigateToScene({
                projectId: act.projectId,
                sceneId: act.sceneId || null,
                transition: act.transition || { type: 'fade', durationMs: 400 },
                preload: act.preload ?? true
            });
        }
        if (act.type === 'openClosePanel' && act.targetId) {
            const mode = act.mode || 'toggle';
            setSceneData(prev => prev.map(o => {
                if (o.id !== act.targetId) return o;
                const nextVisible = mode === 'show' ? true : mode === 'hide' ? false : (o.visible === false ? true : false);
                track?.("panel_toggle", { targetId: o.id, visible: nextVisible });
                return { ...o, visible: nextVisible };
            }));
        }
    });
}


// -------------------- Viewer --------------------

export default function ARViewer() {
    const { id } = useParams();
    const [sceneData, setSceneData] = useState([]);
    const [isAR, setIsAR] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const userGroupRef = useRef();
    const { track, sessionId } = useAnalytics({ projectId: id });

    // Anchor group: the whole scene is a child of this node, driven by anchor pose
    const anchorGroupRef = useRef();
    const currentAnchorRef = useRef(null); // XRAnchor
    const fallbackPoseMatrixRef = useRef(null); // Float32Array (when anchors unsupported)

    // lightweight texture preloader (images); ModelItem will load GLBs on mount
    const preloadAssets = useCallback(async (items = []) => {
        const loader = new THREE.TextureLoader();
        await Promise.all(items.filter(it => it.type === 'image' && it.url).map(it => new Promise((res) => {
            loader.load(it.url, () => res(), () => res()); // ignore errors here
        })));
    }, []);

    const navigateToProject = (projectId) => {
        window.location.href = `/ar/${projectId}`;
    };

    // Hot-swap navigator: keeps XR session & anchor, swaps content only
    const navigateToScene = useCallback(async ({ projectId, sceneId, transition, preload }) => {
        try {
            setIsTransitioning(transition?.type === 'fade');
            // 1) fetch published scene (try sceneId param if backend supports it)
            const url = sceneId
                ? `${import.meta.env.VITE_API_URL}/api/published/${projectId}?sceneId=${encodeURIComponent(sceneId)}`
                : `${import.meta.env.VITE_API_URL}/api/published/${projectId}`;
            const res = await fetch(url);
            const data = await res.json();
            if (!res.ok || !data.publishedScene) throw new Error(data?.error || 'Failed to load target scene');
            const nextItems = data.publishedScene;

            // 2) optional preload
            if (preload) {
                await preloadAssets(nextItems);
            }

            // 3) fade out
            if (transition?.type === 'fade') {
                await new Promise(r => setTimeout(r, transition.durationMs ?? 400));
            }

            // 4) replace items (keep anchor pose/session)
            setSceneData(nextItems);

            // 5) fade in
            if (transition?.type === 'fade') {
                // small delay to let new items mount before fading back
                await new Promise(r => requestAnimationFrame(r));
                setIsTransitioning(false);
            }

            // 6) update URL (shareability) without reload
            const u = new URL(window.location.href);
            u.pathname = `/ar/${projectId}`;
            if (sceneId) u.searchParams.set('scene', sceneId); else u.searchParams.delete('scene');
            history.pushState({}, '', u);
        } catch (e) {
            console.error('navigateToScene error:', e);
            setIsTransitioning(false);
            alert(e?.message || 'Failed to navigate to scene');
        }
    }, [preloadAssets]);

    useEffect(() => {
        const fetchScene = async () => {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/api/published/${id}`);
                const data = await res.json();
                console.log('📦 AR Scene Data:', data);
                if (res.ok && data.publishedScene) {
                    setSceneData(data.publishedScene);
                    try {
                        const items = data.publishedScene;
                        const counts = items.reduce((acc, it) => {
                            acc[it.type] = (acc[it.type] || 0) + 1;
                            return acc;
                        }, {});
                        track("scene_loaded", {
                            itemCount: items.length,
                            byType: counts,
                            projectId: id,
                        });
                    } catch { }
                }
            } catch (err) {
                console.error('Failed to load published scene', err);
            }
        };
        fetchScene();
    }, [id]);

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
        track("ar_place", {
            projectId: id,
            usedAnchor: Boolean(anchor),
            usedStaticPose: Boolean(poseMatrix),
        });
    }, [id, track]);

    const objectRefs = useRef(new Map());
    const registerRef = useCallback((id, ref) => {
        if (!id) return;
        if (ref) objectRefs.current.set(id, ref);
        else objectRefs.current.delete(id);
    }, []);
    const getObjectRefById = useCallback((id) => objectRefs.current.get(id) || null, []);


    return (
        <div className="w-screen h-screen touch-none select-none">
            <Canvas
                gl={{ antialias: true, alpha: true, premultipliedAlpha: true }}
                camera={{ position: [0, 1.6, 10], fov: 70 }}
                onCreated={({ gl /*, scene */ }) => {
                    gl.xr.enabled = true;

                    // Transparent clears so camera feed shows through in AR
                    gl.setClearColor(0x000000, 0);       // <— alpha = 0 is key
                    gl.setClearAlpha?.(0);               // some builds prefer this too
                    gl.domElement.style.background = 'transparent';

                    gl.domElement.style.touchAction = 'none';
                    try { gl.xr.setReferenceSpaceType?.('local-floor'); } catch { }

                    gl.xr.addEventListener('sessionstart', () => { /* ... */ });
                    gl.xr.addEventListener('sessionend', () => { /* ... */ });

                    const button = ARButton.createButton(gl, {
                        requiredFeatures: ['hit-test'],
                        optionalFeatures: ['anchors', 'local-floor', 'dom-overlay'],
                        domOverlay: { root: document.body }
                    });
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

                {isAR && (
                    <ARGestureControls
                        enabled={true}
                        targetRef={userGroupRef}
                        minScale={0.1}
                        maxScale={8}
                        rotateSpeed={0.006}
                    />
                )}

                {/* Anchor-driven root (matrix updated from anchor/pose per frame) */}
                <group ref={anchorGroupRef} matrixAutoUpdate={false}>
                    <group ref={userGroupRef}>
                        {sceneData.map((item) => {
                            if (item.visible === false) return null;

                            if (item.type === 'model') {
                                return (
                                    <ModelItem
                                        key={item.id}
                                        id={item.id}
                                        url={item.url}
                                        transform={item.transform}
                                        selectedAnimationIndex={item.selectedAnimationIndex}
                                        autoplay={item.autoplay}
                                        isPaused={item.isPaused}
                                        behaviors={item.behaviors || []}
                                        registerRef={registerRef}
                                        getObjectRefById={getObjectRefById}
                                    />
                                );
                            } if (item.type === 'ifc') {
                                return (
                                    <IfcItem
                                        key={item.id}
                                        id={item.id}
                                        url={item.url}
                                        transform={item.transform}
                                        isPaused={item.isPaused}
                                        behaviors={item.behaviors || []}
                                        registerRef={registerRef}
                                        getObjectRefById={getObjectRefById}
                                    />
                                );
                            } if (item.type === 'image') {
                                return (
                                    <ImageItem
                                        key={item.id}
                                        id={item.id}
                                        url={item.url}
                                        transform={item.transform}
                                        isPaused={item.isPaused}
                                        behaviors={item.behaviors || []}
                                        registerRef={registerRef}
                                        getObjectRefById={getObjectRefById}
                                    // (optional) width={item.width} height={item.height} opacity={item.opacity}
                                    />
                                );
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
                                        onPress={(btn) => runActions(btn.interactions, setSceneData, navigateToProject, track, navigateToScene)}
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
            {/* Fade overlay */}
            <div
                className="pointer-events-none fixed inset-0 bg-black transition-opacity duration-300"
                style={{ opacity: isTransitioning ? 0.85 : 0 }}
            />
        </div>
    );
}
