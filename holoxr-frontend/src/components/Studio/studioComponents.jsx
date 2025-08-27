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
            {isSelected && transformMode !== "none" && (
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
export function BehaviorRunner({ targetRef, behaviors = [], getObjectRefById, paused }) {
    const [start] = useState(() => performance.now());

    useFrame(() => {
        if (paused) return;
        const obj = targetRef?.current;
        if (!obj || !behaviors?.length) return;

        const now = performance.now();
        for (const b of behaviors) {
            if (b?.enabled === false) continue;
            const delay = Math.max(0, Number(b?.startDelayMs || 0));
            const tms = now - start - delay;
            if (tms < 0) continue;

            // ROTATE SELF
            if (b.type === "rotateSelf") {
                const dps = Number(b.degreesPerSecond || 0);
                const axis = vec3From(b.axis || [0, 1, 0]).normalize();
                // degrees per second -> radians per ms
                const rad = (dps * Math.PI / 180) * (1 / 1000);
                const step = rad; // per ms
                obj.rotateOnAxis(axis, step); // small incremental rotate each frame
            }

            // ORBIT (around target)
            if (b.type === "orbit") {
                const tgtRef = b.targetObjectId ? getObjectRefById?.(b.targetObjectId) : null;
                const center = tgtRef?.current ? tgtRef.current.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(0, 0, 0);
                const axis = vec3From(b.axis || [0, 1, 0]).normalize();
                const dps = Number(b.degreesPerSecond || 0);
                const radius = Math.max(0, Number(b.radius || 0));
                const initialDeg = Number(b.initialAngleDeg || 0);

                // angle in radians at time t
                const angleRad = (initialDeg * Math.PI / 180) + (dps * Math.PI / 180) * (tms / 1000);

                // Build a basis aligned with axis; pick an arbitrary vector not collinear
                const up = axis.clone();
                const tmp = Math.abs(up.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
                const right = new THREE.Vector3().crossVectors(up, tmp).normalize();
                const forward = new THREE.Vector3().crossVectors(right, up).normalize();

                const posLocal = right.clone().multiplyScalar(Math.cos(angleRad) * radius)
                    .add(forward.clone().multiplyScalar(Math.sin(angleRad) * radius));

                const posWorld = center.clone().add(posLocal);
                obj.position.copy(posWorld);
                // Optional: face center
                obj.lookAt(center);
            }

            // TRANSLATE PATH
            if (b.type === "translatePath") {
                const pts = Array.isArray(b.points) ? b.points.map(vec3From) : [];
                if (pts.length < 2) continue;
                const loop = !!b.loop;
                const closed = !!b.closed;
                const dur = Math.max(1, Number(b.durationMs || 1000));
                let t = (tms % dur) / dur;
                if (!loop) t = Math.min(1, t);
                t = ease(b.easing || "linear", t);

                // Build segments
                const segs = [];
                for (let i = 0; i < pts.length - 1; i++) segs.push([pts[i], pts[i + 1]]);
                if (closed) segs.push([pts[pts.length - 1], pts[0]]);

                // Uniform time across segments
                const segT = 1 / segs.length;
                const idx = Math.min(segs.length - 1, Math.floor(t / segT));
                const localT = (t - idx * segT) / segT;

                const [a, bpt] = segs[idx];
                const pos = new THREE.Vector3().lerpVectors(a, bpt, localT);
                obj.position.copy(pos);
            }
        }
    });

    return null;
}
