import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from 'react-router-dom';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { unzipSync } from 'fflate';
import UILabel3D from "../components/Items/UILabel3D";
import Quiz3D from '../components/Items/Quiz3D';

// -------------------- Items --------------------

function ModelItem({ url, transform, selectedAnimationIndex = 0, autoplay = false, isPaused = false }) {
    const mixerRef = useRef();
    const [scene, setScene] = useState(null);
    const [animations, setAnimations] = useState([]);

    useEffect(() => {
        if (!url) return;
        const loadModel = async () => {
            let blobUrl = url;
            if (url.endsWith('.zip')) {
                const res = await fetch(url);
                const arrayBuffer = await res.arrayBuffer();
                const zip = unzipSync(new Uint8Array(arrayBuffer));
                const glbName = Object.keys(zip).find(name => name.endsWith('.glb'));
                if (!glbName) throw new Error('No .glb in zip');
                const blob = new Blob([zip[glbName]], { type: 'model/gltf-binary' });
                blobUrl = URL.createObjectURL(blob);
            }
            const loader = new GLTFLoader();
            loader.load(
                blobUrl,
                (gltf) => {
                    setScene(gltf.scene);
                    setAnimations(gltf.animations || []);
                },
                undefined,
                (err) => console.error('❌ GLB load error:', err)
            );
        };
        loadModel();
    }, [url]);

    useEffect(() => {
        if (!scene || !autoplay || animations.length === 0) return;
        const mixer = new THREE.AnimationMixer(scene);
        mixerRef.current = mixer;
        const clip = animations[selectedAnimationIndex] || animations[0];
        const action = mixer.clipAction(clip);
        action.reset().play();
        return () => {
            mixer.stopAllAction();
            mixer.uncacheRoot(scene);
        };
    }, [scene, animations, selectedAnimationIndex, autoplay]);

    useFrame((_, delta) => {
        if (!isPaused) mixerRef.current?.update(delta);
    });

    if (!scene) return null;

    const t = transform || {};
    return (
        <group
            position={[t.x || 0, t.y || 0, t.z || 0]}
            rotation={[t.rx || 0, t.ry || 0, t.rz || 0]}
            scale={[t.sx || 1, t.sy || 1, t.sz || 1]}
        >
            <primitive object={scene} />
        </group>
    );
}

function ImageItem({ url, transform = {} }) {
    const texture = new THREE.TextureLoader().load(url);
    const ref = useRef();
    useEffect(() => {
        if (ref.current) {
            const { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1 } = transform;
            ref.current.position.set(x, y, z);
            ref.current.rotation.set(rx, ry, rz);
            ref.current.scale.set(sx, sy, sz);
        }
    }, [transform]);
    return (
        <mesh ref={ref}>
            <planeGeometry args={[3, 3]} />
            <meshBasicMaterial map={texture} />
        </mesh>
    );
}

function TextItem({ content, fontSize, color, transform = {} }) {
    const ref = useRef();
    useEffect(() => {
        if (ref.current) {
            const { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1 } = transform;
            ref.current.position.set(x, y, z);
            ref.current.rotation.set(rx, ry, rz);
            ref.current.scale.set(sx, sy, sz);
        }
    }, [transform]);
    return (
        <Text ref={ref} fontSize={fontSize || 1} color={color || 'white'}>
            {content}
        </Text>
    );
}

function ButtonItem({ item, onPress }) {
    const ref = useRef();
    const { transform = {}, appearance = {} } = item;
    useEffect(() => {
        if (!ref.current) return;
        const { x = 0, y = 1, z = 0, rx = 0, ry = 0, rz = 0, sx = 0.4, sy = 0.2, sz = 0.1 } = transform;
        ref.current.position.set(x, y, z);
        ref.current.rotation.set(rx, ry, rz);
        ref.current.scale.set(sx, sy, sz);
    }, [transform]);
    return (
        <group
            ref={ref}
            onPointerDown={(e) => {
                e.stopPropagation();
                onPress?.(item);
            }}
        >
            <mesh>
                <boxGeometry args={[1, 0.4, 0.1]} />
                <meshStandardMaterial color="#2a6df1" />
            </mesh>
            <Text position={[0, 0, 0.06]} fontSize={0.15} color="white" anchorX="center" anchorY="middle">
                {appearance.label || 'Button'}
            </Text>
        </group>
    );
}

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

// -------------------- Camera Indicator --------------------

function ARCameraIndicator({ enabled = true, height = 0.15, radius = 0.06 }) {
    const { gl } = useThree();
    const ref = useRef();

    useEffect(() => {
        if (!ref.current) return;
        ref.current.material.wireframe = true;
        ref.current.material.transparent = true;
        ref.current.material.opacity = 0.8;
    }, []);

    useFrame((_, __, frame) => {
        if (!enabled || !frame || !ref.current) return;
        const refSpace = gl.xr.getReferenceSpace?.();
        const pose = frame.getViewerPose(refSpace);
        if (!pose) return;
        const t = pose.transform;
        ref.current.position.set(t.position.x, t.position.y, t.position.z);
        ref.current.quaternion.set(t.orientation.x, t.orientation.y, t.orientation.z, t.orientation.w);
    });

    return (
        <mesh ref={ref}>
            <coneGeometry args={[radius, height, 4]} />
            <meshBasicMaterial />
        </mesh>
    );
}

// -------------------- AR Controller (hit-test, anchors, reticle & min-distance placement) --------------------

function ARPlacementController({ enableAR, onAnchorPoseMatrix, onTapPlace }) {
    const { gl, scene } = useThree();

    const reticleRef = useRef();
    const hitTestSourceRef = useRef(null);
    const xrRefSpaceRef = useRef(null);
    const viewerSpaceRef = useRef(null);

    // Set up a simple ring reticle
    useEffect(() => {
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.08, 0.1, 32),
            new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9, side: THREE.DoubleSide })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.matrixAutoUpdate = false;
        ring.visible = false;
        scene.add(ring);
        reticleRef.current = ring;
        return () => {
            scene.remove(ring);
            ring.geometry.dispose();
            ring.material.dispose();
        };
    }, [scene]);

    // Handle session lifecycle: request spaces + hitTest
    useEffect(() => {
        if (!enableAR) return;

        function onSessionStart() {
            const session = gl.xr.getSession();
            if (!session) return;

            // request reference spaces
            Promise.all([
                session.requestReferenceSpace('local-floor').catch(() => session.requestReferenceSpace('local')),
                session.requestReferenceSpace('viewer')
            ]).then(([xrRefSpace, viewerSpace]) => {
                xrRefSpaceRef.current = xrRefSpace;
                viewerSpaceRef.current = viewerSpace;
                session.requestHitTestSource({ space: viewerSpace }).then((source) => {
                    hitTestSourceRef.current = source;
                }).catch((e) => console.warn('HitTestSource failed:', e));
            });

            // cleanup on end
            const endHandler = () => {
                hitTestSourceRef.current = null;
                xrRefSpaceRef.current = null;
                viewerSpaceRef.current = null;
                if (reticleRef.current) reticleRef.current.visible = false;
            };
            session.addEventListener('end', endHandler);
        }

        gl.xr.addEventListener('sessionstart', onSessionStart);
        return () => {
            gl.xr.removeEventListener('sessionstart', onSessionStart);
        };
    }, [gl, enableAR]);

    // Per-frame reticle + anchor pose updates
    useFrame((_, __, frame) => {
        if (!frame) return;

        const source = hitTestSourceRef.current;
        const xrRefSpace = xrRefSpaceRef.current;
        const reticle = reticleRef.current;

        // Update reticle by hit-test
        if (source && xrRefSpace && reticle) {
            const results = frame.getHitTestResults(source);
            if (results.length > 0) {
                const hit = results[0];
                const pose = hit.getPose(xrRefSpace);
                if (pose) {
                    reticle.visible = true;
                    reticle.matrix.fromArray(pose.transform.matrix);
                }
            } else {
                reticle.visible = false;
            }
        }

        // If parent provided a callback to update anchor-driven matrix, call it every frame
        if (onAnchorPoseMatrix) onAnchorPoseMatrix(frame, xrRefSpace || gl.xr.getReferenceSpace());
    });

    // Tap to place anchor with minimum distance from camera
    const handleTap = useCallback(() => {
        const frame = gl.xr.getFrame?.();
        const session = gl.xr.getSession?.();
        const source = hitTestSourceRef.current;
        const xrRefSpace = xrRefSpaceRef.current;
        if (!frame || !session || !source || !xrRefSpace) return;

        const results = frame.getHitTestResults(source);
        if (!results || results.length === 0) return;

        const hit = results[0];

        // Camera pose
        const viewerPose = frame.getViewerPose(xrRefSpace);
        if (!viewerPose) return;
        const vp = viewerPose.transform.position;
        const vq = viewerPose.transform.orientation;
        const camPos = new THREE.Vector3(vp.x, vp.y, vp.z);
        const camQuat = new THREE.Quaternion(vq.x, vq.y, vq.z, vq.w);
        const camForward = new THREE.Vector3(0, 0, -1).applyQuaternion(camQuat);

        // Compute final placement (≥ 1m in front if too close)
        const MIN_PLACE_DIST = 1.0;
        const hitPose = hit.getPose?.(xrRefSpace);
        let finalPos, finalQuat = camQuat.clone();

        if (hitPose) {
            const m = new THREE.Matrix4().fromArray(hitPose.transform.matrix);
            const hitPos = new THREE.Vector3().setFromMatrixPosition(m);
            const dist = hitPos.distanceTo(camPos);

            if (dist < MIN_PLACE_DIST) {
                finalPos = camPos.clone().add(camForward.multiplyScalar(MIN_PLACE_DIST));
            } else {
                finalPos = hitPos;
                const r = new THREE.Quaternion().setFromRotationMatrix(m);
                finalQuat.copy(r);
            }
        } else {
            finalPos = camPos.clone().add(camForward.multiplyScalar(MIN_PLACE_DIST));
        }

        // Create anchor at adjusted transform; fallback to matrix if anchors unsupported
        const xf = new XRRigidTransform(
            { x: finalPos.x, y: finalPos.y, z: finalPos.z },
            { x: finalQuat.x, y: finalQuat.y, z: finalQuat.z, w: finalQuat.w }
        );

        if (frame.createAnchor) {
            frame.createAnchor(xf, xrRefSpace)
                .then(anchor => onTapPlace?.({ anchor, xrRefSpace }))
                .catch(() => {
                    const mat = new THREE.Matrix4().compose(finalPos, finalQuat, new THREE.Vector3(1, 1, 1));
                    onTapPlace?.({ anchor: null, poseMatrix: mat.toArray(), xrRefSpace });
                });
        } else if (hit.createAnchor) {
            hit.createAnchor()
                .then(anchor => onTapPlace?.({ anchor, xrRefSpace }))
                .catch(() => {
                    const mat = new THREE.Matrix4().compose(finalPos, finalQuat, new THREE.Vector3(1, 1, 1));
                    onTapPlace?.({ anchor: null, poseMatrix: mat.toArray(), xrRefSpace });
                });
        } else {
            const mat = new THREE.Matrix4().compose(finalPos, finalQuat, new THREE.Vector3(1, 1, 1));
            onTapPlace?.({ anchor: null, poseMatrix: mat.toArray(), xrRefSpace });
        }
    }, [gl, onTapPlace]);

    // Only listen during AR
    useEffect(() => {
        const canvas = gl.domElement;
        if (!enableAR) return;
        canvas.addEventListener('click', handleTap);
        return () => canvas.removeEventListener('click', handleTap);
    }, [gl, enableAR, handleTap]);

    return null; // controller renders nothing (reticle is added directly to scene)
}

function ARGestureControls({ enabled, targetRef, minScale = 0.1, maxScale = 5, rotateSpeed = 0.005 }) {
    const { gl } = useThree();
    const stateRef = useRef({
        touches: [],
        startDist: 0,
        startAngle: 0,
        startScale: 1,
        startYaw: 0,
        lastX: 0,
        rotating: false,
        pinching: false,
    });

    useEffect(() => {
        const canvas = gl.domElement;
        if (!enabled || !targetRef?.current) return;

        // helpers
        const dist = (t0, t1) => {
            const dx = t1.clientX - t0.clientX, dy = t1.clientY - t0.clientY;
            return Math.hypot(dx, dy);
        };
        const ang = (t0, t1) => Math.atan2(t1.clientY - t0.clientY, t1.clientX - t0.clientX);

        const onStart = (e) => {
            const s = stateRef.current;
            s.touches = Array.from(e.touches);
            const target = targetRef.current;
            if (!target) return;

            if (s.touches.length === 1) {
                s.rotating = true;
                s.pinching = false;
                s.lastX = s.touches[0].clientX;
                s.startYaw = target.rotation.y;
            } else if (s.touches.length >= 2) {
                s.rotating = false;
                s.pinching = true;
                const [t0, t1] = s.touches;
                s.startDist = dist(t0, t1);
                s.startAngle = ang(t0, t1);
                s.startScale = target.scale.x; // assume uniform scale
                s.startYaw = target.rotation.y;
            }
        };

        const onMove = (e) => {
            const s = stateRef.current;
            const target = targetRef.current;
            if (!target) return;

            s.touches = Array.from(e.touches);

            if (s.pinching && s.touches.length >= 2) {
                const [t0, t1] = s.touches;
                // pinch scale
                const d = dist(t0, t1);
                if (s.startDist > 0) {
                    let next = (d / s.startDist) * s.startScale;
                    next = Math.min(maxScale, Math.max(minScale, next));
                    target.scale.set(next, next, next);
                }
                // twist rotate (around Y)
                const a = ang(t0, t1);
                const deltaA = a - s.startAngle;
                target.rotation.y = s.startYaw + deltaA;
            } else if (s.rotating && s.touches.length === 1) {
                const x = s.touches[0].clientX;
                const dx = x - s.lastX;
                s.lastX = x;
                target.rotation.y += dx * rotateSpeed;
            }
        };

        const onEnd = (e) => {
            const s = stateRef.current;
            s.touches = Array.from(e.touches);
            if (s.touches.length === 0) {
                s.rotating = false;
                s.pinching = false;
            } else if (s.touches.length === 1) {
                // fall back to one-finger rotate if one finger remains
                s.rotating = true;
                s.pinching = false;
                s.lastX = s.touches[0].clientX;
                s.startYaw = targetRef.current?.rotation.y ?? 0;
            }
        };

        // use non-passive to allow preventDefault if you later need it
        canvas.addEventListener('touchstart', onStart, { passive: true });
        canvas.addEventListener('touchmove', onMove, { passive: true });
        canvas.addEventListener('touchend', onEnd, { passive: true });
        canvas.addEventListener('touchcancel', onEnd, { passive: true });

        return () => {
            canvas.removeEventListener('touchstart', onStart);
            canvas.removeEventListener('touchmove', onMove);
            canvas.removeEventListener('touchend', onEnd);
            canvas.removeEventListener('touchcancel', onEnd);
        };
    }, [gl, enabled, targetRef, minScale, maxScale, rotateSpeed]);

    return null;
}


// -------------------- Viewer --------------------

export default function ARViewer() {
    const { id } = useParams();
    const [sceneData, setSceneData] = useState([]);
    const [isAR, setIsAR] = useState(false);
    const userGroupRef = useRef();

    // Anchor group: the whole scene is a child of this node, driven by anchor pose
    const anchorGroupRef = useRef();
    const currentAnchorRef = useRef(null); // XRAnchor
    const fallbackPoseMatrixRef = useRef(null); // Float32Array (when anchors unsupported)

    const navigateToProject = (projectId) => {
        window.location.href = `/ar/${projectId}`;
    };

    useEffect(() => {
        const fetchScene = async () => {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/api/published/${id}`);
                const data = await res.json();
                console.log('📦 AR Scene Data:', data);
                if (res.ok && data.publishedScene) {
                    setSceneData(data.publishedScene);
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
    }, []);

    return (
        <div className="w-screen h-screen">
            <Canvas
                camera={{ position: [0, 1.6, 10], fov: 70 }}  // push desktop preview camera back
                onCreated={({ gl }) => {
                    gl.xr.enabled = true;

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

                {isAR && <ARCameraIndicator enabled />}

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

                    {sceneData.map((item) => {
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
            </Canvas>
        </div>
    );
}
