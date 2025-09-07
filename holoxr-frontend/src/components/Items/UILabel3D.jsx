import { useEffect, useMemo, useRef, useState } from "react";  // Added useState for dynamic points
import { useThree, useFrame } from "@react-three/fiber";
import { Text, Line, TransformControls } from "@react-three/drei";
import * as THREE from "three";

/**
 * UILabel3D — a movable label with an optional leader line.
 *
 * Props:
 * - id, name
 * - content, fontSize, color
 * - appearance: { bg, padding:[x,y], borderRadius, lineWidth, billboard? }
 * - transform: { x,y,z, rx,ry,rz, sx,sy,sz }
 * - lineMode: 'none' | 'toObject' | 'toPoint'
 * - targetId?: string        // when lineMode='toObject'
 * - anchorPoint?: {x,y,z}    // when lineMode='toPoint'
 * - models: sceneModels[]    // resolve target by id (editor + AR)
 * - selectedModelId, setSelectedModelId
 * - transformMode, orbitRef, isPreviewing
 * - updateModelTransform
 */
export default function UILabel3D({
    id,
    name,
    content = "Label",
    fontSize = 0.35,
    color = "#ffffff",
    appearance = {},
    transform,
    lineMode = "none",
    targetId = null,
    anchorPoint = null,
    models = [],
    selectedModelId,
    setSelectedModelId,
    transformMode = "translate",
    orbitRef,
    isPreviewing = false,
    updateModelTransform,
}) {
    const groupRef = useRef();
    const isSelected = selectedModelId === id;
    const { camera } = useThree();

    const {
        bg = "#111827",
        padding = [0.3, 0.15],
        borderRadius = 0.08, // reserved for rounded rect bg
        lineWidth = 2,
        billboard = false,
    } = appearance || {};

    // Label base position (world)
    const labelPos = useMemo(
        () => new THREE.Vector3(transform.x, transform.y, transform.z),
        [transform.x, transform.y, transform.z]
    );

    // Resolve target world pos based on lineMode
    const targetPos = useMemo(() => {
        if (lineMode === "toObject" && targetId) {
            const t = models.find((m) => m.id === targetId)?.transform;
            if (t) return new THREE.Vector3(t.x, t.y, t.z);
        }
        if (lineMode === "toPoint" && anchorPoint) {
            const { x = 0, y = 0, z = 0 } = anchorPoint || {};
            return new THREE.Vector3(x, y, z);
        }
        return null;
    }, [lineMode, targetId, anchorPoint, models]);

    // Approximate label rect size from text (still used for bg and text wrap)
    const approxWidth = Math.max(1, content.length * (fontSize * 0.28)) + padding[0] * 2;
    const approxHeight = fontSize + padding[1] * 2;

    // Apply rotation/scale
    useEffect(() => {
        if (!groupRef.current) return;
        groupRef.current.rotation.set(transform.rx, transform.ry, transform.rz);
        groupRef.current.scale.set(transform.sx, transform.sy, transform.sz);
    }, [transform.rx, transform.ry, transform.rz, transform.sx, transform.sy, transform.sz]);

    // Optional: billboard toward camera (useful in AR)
    useFrame(() => {
        if (billboard && groupRef.current) {
            groupRef.current.quaternion.copy(camera.quaternion);
        }
    });

    // Select
    const onPointerDown = (e) => {
        e.stopPropagation();
        setSelectedModelId?.(id);
    };

    // Dynamic line points (local space) — start at center
    const [linePoints, setLinePoints] = useState(null);

    // Update points in useEffect (non-billboard) or useFrame (billboard, since rotation changes)
    const updateLinePoints = () => {
        if (!groupRef.current || lineMode === "none" || !targetPos) {
            setLinePoints(null);
            return;
        }
        const localStart = new THREE.Vector3(0, 0, 0); // Center of label
        const localEnd = targetPos.clone();
        groupRef.current.worldToLocal(localEnd);
        setLinePoints([localStart, localEnd]);
    };

    useEffect(() => {
        if (!billboard) updateLinePoints();
    }, [
        billboard,
        lineMode,
        targetPos,
        transform.x,
        transform.y,
        transform.z,
        transform.rx,
        transform.ry,
        transform.rz,
        transform.sx,
        transform.sy,
        transform.sz,
    ]);

    useFrame(() => {
        if (billboard) updateLinePoints();
    });

    return (
        <>
            {/* Controlled object */}
            <group ref={groupRef} position={labelPos} onPointerDown={onPointerDown} name={name || "UILabel3D"}>
                {/* Background plane */}
                <mesh position={[0, 0, -0.001]}>
                    <planeGeometry args={[approxWidth, approxHeight]} />
                    <meshBasicMaterial color={bg} />
                </mesh>

                {/* Text */}
                <Text anchorX="center" anchorY="middle" color={color} fontSize={fontSize} maxWidth={approxWidth - padding[0] * 2}>
                    {content}
                </Text>

                {/* Leader line */}
                {linePoints && <Line points={linePoints} lineWidth={lineWidth} dashed={false} transparent depthTest />}
            </group>

            {/* Editor only: transform gizmo */}
            {isSelected && transformMode !== "none" && !isPreviewing && groupRef.current?.parent && (
                <TransformControls
                    object={groupRef.current}
                    mode={transformMode}
                    onMouseDown={() => {
                        if (orbitRef?.current) orbitRef.current.enabled = false;
                    }}
                    onMouseUp={() => {
                        if (orbitRef?.current) orbitRef.current.enabled = true;
                        if (!groupRef.current) return;
                        const obj = groupRef.current;
                        updateModelTransform?.(id, {
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
            )}
        </>
    );
}