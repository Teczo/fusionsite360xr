// studioComponents.jsx
import { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { TransformControls } from "@react-three/drei";
import * as THREE from "three";
import { BoxHelper } from "three";
import { useMemo } from "react";

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
export function handleFocusOnObject(cameraRef) {
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
