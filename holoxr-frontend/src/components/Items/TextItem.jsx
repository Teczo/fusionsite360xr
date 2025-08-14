import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { TransformControls, Text } from '@react-three/drei';

export default function TextItem({ id, name, content, fontSize, color, transform, selectedModelId, setSelectedModelId, transformMode, updateModelTransform, handleFocusObject }) {
    const ref = useRef();

    useEffect(() => {
        if (ref.current) {
            const { x, y, z, rx, ry, rz, sx, sy, sz } = transform;
            ref.current.position.set(x, y, z);
            ref.current.rotation.set(rx, ry, rz);
            ref.current.scale.set(sx, sy, sz);
        }
    }, [transform]);

    useFrame(() => {
        if (selectedModelId === id && ref.current) {
            const obj = ref.current;
            updateModelTransform(id, {
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
        }
    });

    return (
        <>
            <Text
                ref={ref}
                fontSize={fontSize || 1}
                color={color || 'white'}
                anchorX="center"
                anchorY="middle"
                onClick={(e) => {
                    e.stopPropagation();
                    setSelectedModelId(id);
                }}
                onDoubleClick={(e) => {
                    e.stopPropagation();
                    handleFocusObject(ref);
                }}
            >
                {content}
            </Text>

            {selectedModelId === id && transformMode !== 'none' && ref.current && (
                <TransformControls object={ref.current} mode={transformMode} />
            )}
        </>
    );
}
