import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, TransformControls, useGLTF } from '@react-three/drei';
import { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useLoader } from '@react-three/fiber';
import { Text } from '@react-three/drei';


function GLBModel({ url, name, id, transform, selectedModelId, setSelectedModelId, transformMode, updateModelTransform }) {
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
            <primitive
                ref={ref}
                object={scene}
                onClick={(e) => {
                    e.stopPropagation();
                    setSelectedModelId(id);
                }}
                scale={1}
            />
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

function ImagePlane({ url, id, name, transform, selectedModelId, setSelectedModelId, transformMode, updateModelTransform }) {
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

function TextItem({ id, name, content, fontSize, color, transform, selectedModelId, setSelectedModelId, transformMode, updateModelTransform }) {

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
            >
                {content}
            </Text>

            {selectedModelId === id && transformMode !== 'none' && ref.current && (
                <TransformControls object={ref.current} mode={transformMode} />
            )}
        </>
    );
}


function SceneContent({ items, selectedModelId, setSelectedModelId, transformMode, updateModelTransform }) {
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
                        />
                    );
                }


                return null;
            })}
        </>
    );
}

export default function SceneCanvasR3F({ items, selectedModelId, setSelectedModelId, updateModelTransform }) {
    const [transformMode, setTransformMode] = useState('translate');

    return (
        <div className="w-full h-full relative">
            {/* Gizmo Mode Buttons */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-white bg-opacity-80 px-4 py-1 rounded shadow flex gap-2">
                {['translate', 'rotate', 'scale', 'none'].map((mode) => (
                    <button
                        key={mode}
                        onClick={() => setTransformMode(mode)}
                        className={`text-sm px-2 py-1 rounded ${transformMode === mode
                            ? 'bg-black text-white'
                            : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                            }`}
                    >
                        {mode === 'translate' && 'Move'}
                        {mode === 'rotate' && 'Rotate'}
                        {mode === 'scale' && 'Scale'}
                        {mode === 'none' && 'Hide'}
                    </button>
                ))}
            </div>

            <Canvas camera={{ position: [0, 2, 10], fov: 60 }}>
                <ambientLight intensity={0.5} />
                <directionalLight position={[5, 5, 5]} intensity={1} />
                <OrbitControls makeDefault />

                <SceneContent
                    items={items}
                    selectedModelId={selectedModelId}
                    setSelectedModelId={setSelectedModelId}
                    transformMode={transformMode}
                    updateModelTransform={updateModelTransform}
                />
            </Canvas>
        </div>
    );
}
