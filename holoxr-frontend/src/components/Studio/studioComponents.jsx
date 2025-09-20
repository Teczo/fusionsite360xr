// studioComponents.jsx
import { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { TransformControls } from "@react-three/drei";
import * as THREE from "three";
import { BoxHelper } from "three";
import { useMemo } from "react";
import { useState } from "react";

// Camera reset by signal
export function CameraController({ resetSignal }) {
    const { camera } = useThree();
    const resetRef = useRef(resetSignal);

    useEffect(() => {
        if (resetSignal !== resetRef.current) {
            camera.position.set(0, 2, 6);
            camera.lookAt(0, 0, 0);
            resetRef.current = resetSignal;
        }
    }, [resetSignal, camera]);

    return null;
}

// Capture the active R3F camera for focusing utilities
export function CaptureCamera({ cameraRef }) {
    const { camera } = useThree();
    useEffect(() => {
        cameraRef.current = camera;
    }, [camera, cameraRef]);
    return null;
}

// Returns a focus handler bound to a cameraRef
export function handleFocusOnObject({ cameraRef }) {
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

// GLTF with animation + transform gizmo
export function ModelWithAnimation({
    id,
    scene,
    animations,
    selectedAnimationIndex,
    playAnimationKey,
    isPaused,
    behaviors,
    transformMode,
    onTransformEnd,
    isSelected,
    transform,
    orbitRef,
    onSelect,               // NEW
    handleFocusObject,
    getObjectRefById,      // NEW
    registerRef,
}) {
    const ref = useRef();
    const mixerRef = useRef();

    useEffect(() => {
        if (registerRef && id) registerRef(id, ref);
        return () => { if (registerRef && id) registerRef(id, null); };
    }, [registerRef, id]);

    useEffect(() => {
        if (!scene || animations.length === 0) return;

        const mixer = new THREE.AnimationMixer(scene);
        mixerRef.current = mixer;

        const clip = animations[selectedAnimationIndex];
        if (clip) {
            const action = mixer.clipAction(clip);
            action.reset().play();
        }

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
            <primitive
                ref={ref}
                object={scene}
                onPointerDown={(e) => {
                    e.stopPropagation();
                    onSelect?.(id);
                }}
                onDoubleClick={(e) => {
                    e.stopPropagation();
                    handleFocusObject?.(ref);
                }}
            />
            {/* Backend behavior runner (rotate/orbit/translatePath) */}
            <BehaviorRunner
                targetRef={ref}
                behaviors={behaviors}
                getObjectRefById={getObjectRefById}
                paused={isPaused}
            />
            {isSelected && ref.current && (
                <primitive object={new BoxHelper(ref.current, new THREE.Color("skyblue"))} />
            )}
            {isSelected && transformMode !== "none" && ref.current?.parent && (
                <TransformControls
                    object={ref.current}
                    mode={transformMode}
                    onMouseDown={() => { if (orbitRef.current) orbitRef.current.enabled = false; }}
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

export function CameraFrustumIndicator({
    // Overall size in world units (keep small)
    scale = 0.15,
    // How far in front of the camera to place the gizmo so it doesn't clip at the near plane
    forwardOffset = 0.25,
    color = "#ffffff",
    lineWidth = 1, // thickness on some platforms (ignored by many WebGL impls)
}) {
    const { camera } = useThree();
    const group = useRef();
    const tmpDir = useMemo(() => new THREE.Vector3(), []);

    // Wireframe pyramid (tip = camera, base = view rectangle)
    const geometry = useMemo(() => {
        // A unit camera pyramid pointing -Z, base at z = -1, tip at 0
        const s = 0.5;     // half-width/height of base square
        const d = 1.0;     // distance to base along -Z
        const verts = new Float32Array([
            // tip -> base corners
            0, 0, 0, s, s, -d,
            0, 0, 0, -s, s, -d,
            0, 0, 0, -s, -s, -d,
            0, 0, 0, s, -s, -d,
            // base rectangle
            s, s, -d, -s, s, -d,
            -s, s, -d, -s, -s, -d,
            -s, -s, -d, s, -s, -d,
            s, -s, -d, s, s, -d,
        ]);
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(verts, 3));
        return geo;
    }, []);

    useFrame(() => {
        if (!group.current) return;
        // position = camera pos + forwardOffset along camera forward
        camera.getWorldDirection(tmpDir).normalize();
        group.current.position.copy(camera.position).add(tmpDir.multiplyScalar(forwardOffset));
        group.current.quaternion.copy(camera.quaternion);
        group.current.scale.setScalar(scale);
    });

    return (
        <group ref={group} renderOrder={0}>
            <lineSegments>
                <bufferGeometry {...{ attributes: geometry.attributes }} />
                <lineBasicMaterial color={color} linewidth={lineWidth} depthTest depthWrite />
            </lineSegments>
            {/* tiny “body” rectangle behind the tip (optional, wireframe) */}
            <lineSegments position={[0, 0, 0.15]}>
                <edgesGeometry args={[new THREE.BoxGeometry(0.35, 0.22, 0.18)]} />
                <lineBasicMaterial color={color} depthTest depthWrite />
            </lineSegments>
        </group>
    );
}

function ease(type, t) {
    if (type === "easeIn") return t * t;
    if (type === "easeOut") return 1 - Math.pow(1 - t, 2);
    if (type === "easeInOut") return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    return t;
}

// ---------- UTIL ----------
function vec3From(obj) {
    if (!Array.isArray(obj) || obj.length !== 3) return new THREE.Vector3(0, 1, 0);
    return new THREE.Vector3(Number(obj[0]) || 0, Number(obj[1]) || 0, Number(obj[2]) || 0);
}

// ---------- BehaviorRunner ----------
/**
 * Applies backend "behaviors" to a target object ref.
 * Supports: rotateSelf, orbit, translatePath
 *
 * Props:
 * - targetRef: ref to the THREE.Object3D to animate
 * - behaviors: array from /api/animations (per object)
 * - getObjectRefById: (id) => ref to another object (for orbit target)
 * - paused: boolean
 */
// --- BehaviorRunner ---------------------------------------------------------
export function BehaviorRunner({ targetRef, behaviors = [], getObjectRefById, paused = false }) {
    const baseRef = useRef(null);        // base transform snapshot
    const stateRef = useRef([]);         // per-behavior runtime state

    // temp objects to avoid allocations
    const _vA = useMemo(() => new THREE.Vector3(), []);
    const _vB = useMemo(() => new THREE.Vector3(), []);
    const _axis = useMemo(() => new THREE.Vector3(), []);
    const _quat = useMemo(() => new THREE.Quaternion(), []);
    const _baseQuat = useMemo(() => new THREE.Quaternion(), []);
    const _mat4 = useMemo(() => new THREE.Matrix4(), []);

    // Easing
    const ease = (type, t) => {
        switch (type) {
            case 'easeIn': return t * t;
            case 'easeOut': return t * (2 - t);
            case 'easeInOut': return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            default: return t; // linear
        }
    };

    // Build cumulative lengths for translatePath
    function buildPath(points) {
        const segs = [];
        let total = 0;
        for (let i = 0; i < points.length - 1; i++) {
            const a = points[i], b = points[i + 1];
            const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
            segs.push(len);
            total += len;
        }
        const cum = [0];
        let acc = 0;
        for (let i = 0; i < segs.length; i++) {
            acc += segs[i];
            cum.push(acc);
        }
        return { segs, cum, total };
    }

    // Basis from axis for orbit (u,v plane)
    function orbitBasis(axisArray) {
        const a = _axis.set(axisArray?.[0] ?? 0, axisArray?.[1] ?? 1, axisArray?.[2] ?? 0).clone().normalize();
        const arbitrary = Math.abs(a.y) < 0.99 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
        const u = new THREE.Vector3().crossVectors(arbitrary, a).normalize();
        const v = new THREE.Vector3().crossVectors(a, u).normalize();
        return { a, u, v };
    }

    // Reset runtime state when target or behaviors change
    useEffect(() => {
        const obj = targetRef?.current;
        if (!obj) return;

        // snapshot base transform
        baseRef.current = {
            pos: obj.position.clone(),
            quat: obj.quaternion.clone(),
            scl: obj.scale.clone(),
        };

        stateRef.current = (behaviors || []).map((b) => {
            const playbackMode = b.playbackMode || (b.loop ? 'loop' : 'once');
            const startDelayMs = Math.max(0, b.startDelayMs || 0);
            const holdMs = Math.max(0, b.holdMs || 0);

            const s = {
                type: b.type,
                enabled: b.enabled !== false,
                playbackMode,
                startDelayMs,
                holdMs,
                delayLeftMs: startDelayMs,
                holdingLeftMs: 0,
                dir: 1,            // for pingpong direction
            };

            if (b.type === 'rotateSelf') {
                s.axis = new THREE.Vector3(b.axis?.[0] ?? 0, b.axis?.[1] ?? 1, b.axis?.[2] ?? 0).normalize();
                s.dps = b.degreesPerSecond ?? 0;
                s.maxAngleDeg = Math.max(0, b.maxAngleDeg || 0);
                s.accumDeg = 0; // travel since start (for once/pingpong)
            }

            if (b.type === 'orbit') {
                s.axis = new THREE.Vector3(b.axis?.[0] ?? 0, b.axis?.[1] ?? 1, b.axis?.[2] ?? 0).normalize();
                const { u, v } = orbitBasis(b.axis);
                s.u = u; s.v = v;
                s.radius = Math.max(0, b.radius ?? 0);
                s.initialAngle = b.initialAngleDeg ?? 0;
                s.endAngle = b.endAngleDeg ?? (s.initialAngle + 180);
                s.angleDeg = s.initialAngle;
                s.dps = b.degreesPerSecond ?? 0;
                s.targetObjectId = b.targetObjectId || null;
            }

            if (b.type === 'translatePath') {
                const pts = Array.isArray(b.points) && b.points.length >= 2
                    ? b.points
                    : [[0, 0, 0], [1, 0, 0]];
                s.points = pts;
                s.duration = Math.max(1, b.durationMs || 1000);
                s.easing = b.easing || 'linear';
                s.closed = !!b.closed;
                s.loopCompat = !!b.loop; // back-compat
                s.path = buildPath(pts);
                s.elapsed = 0;
            }

            return s;
        });
    }, [targetRef, behaviors, paused]);

    // Apply all behaviors every frame
    useFrame((_, delta) => {
        if (paused) return;
        const obj = targetRef?.current;
        const base = baseRef.current;
        if (!obj || !base) return;

        // restore base before applying behavior stack
        obj.position.copy(base.pos);
        obj.quaternion.copy(base.quat);
        obj.scale.copy(base.scl);

        for (let i = 0; i < stateRef.current.length; i++) {
            const s = stateRef.current[i];
            if (!s.enabled) continue;

            // handle initial delay / hold-at-ends
            if (s.delayLeftMs > 0) { s.delayLeftMs = Math.max(0, s.delayLeftMs - delta * 1000); continue; }
            if (s.holdingLeftMs > 0) { s.holdingLeftMs = Math.max(0, s.holdingLeftMs - delta * 1000); continue; }

            if (s.type === 'rotateSelf') {
                const step = (s.dps || 0) * delta * s.dir;
                // if capped by pingpong/once
                const mode = s.playbackMode;
                if ((mode === 'pingpong' || mode === 'once') && s.maxAngleDeg > 0) {
                    // clamp bounce 0..max
                    let next = s.accumDeg + step;
                    if (mode === 'once') {
                        if (next >= s.maxAngleDeg) { next = s.maxAngleDeg; }
                        if (next <= 0) { next = 0; }
                    }
                    if (mode === 'pingpong') {
                        if (next >= s.maxAngleDeg) {
                            next = s.maxAngleDeg;
                            s.dir = -1;
                            s.holdingLeftMs = s.holdMs;
                        } else if (next <= 0) {
                            next = 0;
                            s.dir = 1;
                            s.holdingLeftMs = s.holdMs;
                        }
                    }
                    const deltaDeg = next - s.accumDeg;
                    s.accumDeg = next;

                    _quat.setFromAxisAngle(s.axis, THREE.MathUtils.degToRad(deltaDeg));
                    obj.quaternion.multiply(_quat);

                    // stop when once completed
                    if (mode === 'once' && s.accumDeg >= s.maxAngleDeg) {
                        s.enabled = false;
                    }
                } else {
                    // free spin (loop mode or no cap)
                    _quat.setFromAxisAngle(s.axis, THREE.MathUtils.degToRad(step));
                    obj.quaternion.multiply(_quat);
                }
            }

            if (s.type === 'orbit') {
                // where to orbit around
                let center = _vA.set(0, 0, 0);
                if (s.targetObjectId && getObjectRefById) {
                    const ref = getObjectRefById(s.targetObjectId)?.current;
                    if (ref) center = ref.getWorldPosition(_vA);
                } else {
                    // default to base position as center
                    center.copy(base.pos);
                }

                const mode = s.playbackMode;
                const step = (s.dps || 0) * delta * s.dir;
                if ((mode === 'pingpong' || mode === 'once')) {
                    const a0 = Math.min(s.initialAngle, s.endAngle);
                    const a1 = Math.max(s.initialAngle, s.endAngle);
                    let next = s.angleDeg + step;
                    // reflect at bounds
                    if (mode === 'pingpong') {
                        if (next >= a1) { next = a1; s.dir = -1; s.holdingLeftMs = s.holdMs; }
                        else if (next <= a0) { next = a0; s.dir = 1; s.holdingLeftMs = s.holdMs; }
                    } else {
                        next = Math.min(a1, Math.max(a0, next));
                    }
                    s.angleDeg = next;

                    // stop after once completes
                    if (mode === 'once' && ((s.dir > 0 && s.angleDeg >= s.endAngle) || (s.dir < 0 && s.angleDeg <= s.initialAngle))) {
                        s.enabled = false;
                    }
                } else {
                    s.angleDeg += step;
                }

                // position on orbit plane
                const theta = THREE.MathUtils.degToRad(s.angleDeg);
                const pos = _vB.copy(center)
                    .addScaledVector(s.u, s.radius * Math.cos(theta))
                    .addScaledVector(s.v, s.radius * Math.sin(theta));

                obj.position.copy(pos);
            }

            if (s.type === 'translatePath') {
                const mode = s.playbackMode || (s.loopCompat ? 'loop' : 'once');
                const dur = s.duration;

                s.elapsed += delta * 1000;

                // normalized time 0..1 (with triangle fold for pingpong)
                let u;
                if (mode === 'pingpong') {
                    const p = (s.elapsed % (2 * dur)) / dur; // 0..2
                    u = p <= 1 ? p : (2 - p);                // 0..1..0
                    // Pause at ends
                    if ((p <= 0.001 || Math.abs(p - 1) <= 0.001) && s.holdMs > 0) {
                        s.holdingLeftMs = s.holdMs;
                    }
                } else if (mode === 'once') {
                    u = Math.min(1, s.elapsed / dur);
                    if (u >= 1) s.enabled = false;
                } else {
                    u = (s.elapsed % dur) / dur; // loop
                }

                // easing
                u = ease(s.easing, u);

                // walk along path by distance
                const total = s.path.total;
                if (total <= 0) continue;
                const targetDist = u * total;

                let segIdx = 0;
                while (segIdx < s.path.cum.length - 1 && s.path.cum[segIdx + 1] < targetDist) segIdx++;

                const segStartDist = s.path.cum[segIdx];
                const segLen = s.path.segs[segIdx] || 1;
                const segT = Math.min(1, Math.max(0, (targetDist - segStartDist) / segLen));

                const a = s.points[segIdx];
                const b = s.points[segIdx + 1];
                const px = THREE.MathUtils.lerp(a[0], b[0], segT);
                const py = THREE.MathUtils.lerp(a[1], b[1], segT);
                const pz = THREE.MathUtils.lerp(a[2], b[2], segT);

                // points are treated as local offsets from base
                obj.position.set(base.pos.x + px, base.pos.y + py, base.pos.z + pz);
            }
        }
    });

    return null;
}
