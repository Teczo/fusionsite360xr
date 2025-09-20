import { useEffect, useRef } from 'react';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { TransformControls } from '@react-three/drei';
import { BehaviorRunner } from '../Studio/studioComponents';

export default function ImagePlane({
    url,
    id,
    name,
    transform,
    selectedModelId,
    setSelectedModelId,
    transformMode,
    updateModelTransform,
    handleFocusObject,

    // NEW for behaviors/orbit
    behaviors = [],
    isPaused = false,
    registerRef,
    getObjectRefById,

    // optional
    width = 3,
    height = 3,
    opacity = 1,
}) {
    const texture = useLoader(THREE.TextureLoader, url);
    const containerRef = useRef();

    useEffect(() => {
        // register/unregister for orbit target lookup
        registerRef?.(id, containerRef);
        return () => registerRef?.(id, null);
    }, [id, registerRef]);

    useEffect(() => {
        if (!containerRef.current) return;
        const { x, y, z, rx, ry, rz, sx, sy, sz } = transform;
        containerRef.current.position.set(x, y, z);
        containerRef.current.rotation.set(rx, ry, rz);
        containerRef.current.scale.set(sx, sy, sz);
    }, [transform]);

    return (
        <>
            <group
                ref={containerRef}
                onClick={(e) => {
                    e.stopPropagation();
                    setSelectedModelId(id);
                }}
                onDoubleClick={(e) => {
                    e.stopPropagation();
                    handleFocusObject(containerRef);
                }}
            >
                <mesh>
                    <planeGeometry args={[width, height]} />
                    <meshBasicMaterial
                        map={texture}
                        transparent={true}
                        alphaTest={0.5}
                        depthWrite={false}
                        side={THREE.DoubleSide}
                    />
                </mesh>

                {/* Run rotate/orbit/translate behaviors in Studio */}
                <BehaviorRunner
                    targetRef={containerRef}
                    behaviors={behaviors}
                    getObjectRefById={getObjectRefById}
                    paused={isPaused}
                />
            </group>

            {selectedModelId === id && transformMode !== 'none' && containerRef.current?.parent && (
                <TransformControls
                    object={containerRef.current}
                    mode={transformMode}
                    onMouseUp={() => {
                        if (!containerRef.current) return;
                        updateModelTransform(id, {
                            x: containerRef.current.position.x,
                            y: containerRef.current.position.y,
                            z: containerRef.current.position.z,
                            rx: containerRef.current.rotation.x,
                            ry: containerRef.current.rotation.y,
                            rz: containerRef.current.rotation.z,
                            sx: containerRef.current.scale.x,
                            sy: containerRef.current.scale.y,
                            sz: containerRef.current.scale.z,
                        });
                    }}
                />
            )}
        </>
    );
}
