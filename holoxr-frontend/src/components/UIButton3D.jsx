import { useRef, useEffect } from 'react';
import { TransformControls, Text } from '@react-three/drei';

export default function UIButton3D({
    id, name, appearance, transform,
    selectedModelId, setSelectedModelId,
    transformMode, updateModelTransform,
    isPreviewing, onPress
}) {
    const ref = useRef();

    useEffect(() => {
        if (!ref.current || !transform) return;
        const { x, y, z, rx, ry, rz, sx, sy, sz } = transform;
        ref.current.position.set(x, y, z);
        ref.current.rotation.set(rx, ry, rz);
        ref.current.scale.set(sx, sy, sz);
    }, [transform]);

    return (
        <>
            <group
                ref={ref}
                onClick={(e) => {
                    e.stopPropagation();
                    if (isPreviewing) {
                        onPress?.(id);
                    } else {
                        setSelectedModelId(id);
                    }
                }}
            >
                {/* a rounded-ish capsule button: scale Y smaller; add a label */}
                <mesh>
                    <boxGeometry args={[1, 0.4, 0.1]} />
                    <meshStandardMaterial color="#2a6df1" />
                </mesh>
                <Text
                    position={[0, 0, 0.06]}
                    fontSize={0.15}
                    color="white"
                    anchorX="center"
                    anchorY="middle"
                >
                    {appearance?.label || 'Button'}
                </Text>
            </group>

            {selectedModelId === id && transformMode !== 'none' && ref.current && !isPreviewing && (
                <TransformControls
                    object={ref.current}
                    mode={transformMode}
                    onMouseUp={() => {
                        if (!ref.current) return;
                        updateModelTransform(id, {
                            x: ref.current.position.x, y: ref.current.position.y, z: ref.current.position.z,
                            rx: ref.current.rotation.x, ry: ref.current.rotation.y, rz: ref.current.rotation.z,
                            sx: ref.current.scale.x, sy: ref.current.scale.y, sz: ref.current.scale.z,
                        });
                    }}
                />
            )}
        </>
    );
}
