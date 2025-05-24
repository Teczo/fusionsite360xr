import { useRef, useEffect } from 'react';
import { useLoader, useFrame } from '@react-three/fiber';
import { TransformControls, useGLTF, Text } from '@react-three/drei';
import * as THREE from 'three';

function GLBModel({ url, name, id, transform, selectedModelId, setSelectedModelId, transformMode, updateModelTransform, handleFocusObject }) {
    const { scene } = useGLTF(url);
    const ref = useRef();

    useEffect(() => {
        scene.traverse((child) => {
            child.name = name;
        });
    }, [scene, name]);

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
            <group
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
                <primitive object={scene} />
            </group>

            {selectedModelId === id && transformMode !== 'none' && ref.current && (
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

function ImagePlane({ url, id, name, transform, selectedModelId, setSelectedModelId, transformMode, updateModelTransform, handleFocusObject }) {
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

            {selectedModelId === id && transformMode !== 'none' && ref.current && (
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

function TextItem({ id, name, content, fontSize, color, transform, selectedModelId, setSelectedModelId, transformMode, updateModelTransform, handleFocusObject }) {
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

function SceneContent({ items, selectedModelId, setSelectedModelId, transformMode, updateModelTransform, handleFocusObject }) {
    return (
        <>
            {items.map((item) => {
                if (item.type === 'model') {
                    return (
                        <GLBModel
                            key={item.id}
                            {...item}
                            selectedModelId={selectedModelId}
                            setSelectedModelId={setSelectedModelId}
                            transformMode={transformMode}
                            updateModelTransform={updateModelTransform}
                            handleFocusObject={handleFocusObject}
                        />
                    );
                }

                if (item.type === 'image') {
                    return (
                        <ImagePlane
                            key={item.id}
                            {...item}
                            selectedModelId={selectedModelId}
                            setSelectedModelId={setSelectedModelId}
                            transformMode={transformMode}
                            updateModelTransform={updateModelTransform}
                            handleFocusObject={handleFocusObject}
                        />
                    );
                }

                if (item.type === 'text') {
                    return (
                        <TextItem
                            key={item.id}
                            {...item}
                            selectedModelId={selectedModelId}
                            setSelectedModelId={setSelectedModelId}
                            transformMode={transformMode}
                            updateModelTransform={updateModelTransform}
                            handleFocusObject={handleFocusObject}
                        />
                    );
                }

                return null;
            })}
        </>
    );
}

export default SceneContent;
