import { useEffect, useRef } from 'react';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { TransformControls } from '@react-three/drei';

export default function ImagePlane({ url, id, name, transform, selectedModelId, setSelectedModelId, transformMode, updateModelTransform, handleFocusObject }) {
    const texture = useLoader(THREE.TextureLoader, url);
    const ref = useRef();

    useEffect(() => {
        if (ref.current) {
            const { x, y, z, rx, ry, rz, sx, sy, sz } = transform;
            ref.current.position.set(x, y, z);
            ref.current.rotation.set(rx, ry, rz);
            ref.current.scale.set(sx, sy, sz);
        }
    }, [transform]);

    return (
        <>
            <mesh
                ref={ref}
                onClick={(e) => {
                    e.stopPropagation();
                    setSelectedModelId(id);
                }}
                onDoubleClick={(e) => {
                    e.stopPropagation();
                    handleFocusObject(ref);
                }}
            >
                <planeGeometry args={[3, 3]} />
                <meshBasicMaterial map={texture} />
            </mesh>

            {selectedModelId === id && transformMode !== 'none' && ref.current?.parent && (
                <TransformControls
                    object={ref.current}
                    mode={transformMode}
                    onMouseUp={() => {
                        if (!ref.current) return;
                        updateModelTransform(id, {
                            x: ref.current.position.x,
                            y: ref.current.position.y,
                            z: ref.current.position.z,
                            rx: ref.current.rotation.x,
                            ry: ref.current.rotation.y,
                            rz: ref.current.rotation.z,
                            sx: ref.current.scale.x,
                            sy: ref.current.scale.y,
                            sz: ref.current.scale.z,
                        });
                    }}
                />
            )}
        </>
    );
}
