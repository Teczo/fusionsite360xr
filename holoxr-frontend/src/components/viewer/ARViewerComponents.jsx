// ARViewerComponents.jsx
import { useEffect, useRef } from "react";
import { useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { unzipSync } from 'fflate';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { Text } from '@react-three/drei';
import { BehaviorRunner } from "../Studio/studioComponents";

export function ModelItem({
    id,
    url,
    transform,
    selectedAnimationIndex = 0,
    autoplay = false,
    isPaused = false,
    behaviors = [],
    registerRef,
    getObjectRefById
}) {
    const containerRef = useRef();
    const mixerRef = useRef();
    const [scene, setScene] = useState(null);
    const [animations, setAnimations] = useState([]);

    useEffect(() => {
        registerRef?.(id, containerRef);
        return () => registerRef?.(id, null);
    }, [id, registerRef]);

    useEffect(() => {
        if (!url) return;
        const loadModel = async () => {
            let blobUrl = url;
            if (url.endsWith('.zip')) {
                const res = await fetch(url);
                const arrayBuffer = await res.arrayBuffer();
                const zip = unzipSync(new Uint8Array(arrayBuffer));
                const glbName = Object.keys(zip).find(name => name.endsWith('.glb'));
                if (!glbName) throw new Error('No .glb in zip');
                const blob = new Blob([zip[glbName]], { type: 'model/gltf-binary' });
                blobUrl = URL.createObjectURL(blob);
            }
            const loader = new GLTFLoader();
            const draco = new DRACOLoader();
            draco.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
            loader.setDRACOLoader(draco);
            loader.load(
                blobUrl,
                (gltf) => {
                    setScene(gltf.scene);
                    setAnimations(gltf.animations || []);
                },
                undefined,
                (err) => {
                    const msg = err?.message || String(err);
                    console.error('❌ GLB load error:', msg, err);
                    alert(`GLB load error: ${msg}`);
                }
            );
        };
        loadModel();
    }, [url]);

    useEffect(() => {
        if (!scene || !autoplay || animations.length === 0) return;
        const mixer = new THREE.AnimationMixer(scene);
        mixerRef.current = mixer;
        const clip = animations[selectedAnimationIndex] || animations[0];
        const action = mixer.clipAction(clip);
        action.reset().play();
        return () => {
            mixer.stopAllAction();
            mixer.uncacheRoot(scene);
        };
    }, [scene, animations, selectedAnimationIndex, autoplay]);

    useFrame((_, delta) => {
        if (!isPaused) mixerRef.current?.update(delta);
    });

    if (!scene) return null;

    const t = transform || {};
    return (
        <group
            ref={containerRef}
            position={[t.x || 0, t.y || 0, t.z || 0]}
            rotation={[t.rx || 0, t.ry || 0, t.rz || 0]}
            scale={[t.sx || 1, t.sy || 1, t.sz || 1]}
        >
            <primitive object={scene} />

            <BehaviorRunner
                targetRef={containerRef}
                behaviors={behaviors}
                getObjectRefById={getObjectRefById}
                paused={isPaused}
            />
        </group>
    );
}

// ⬇️ UPDATED: ImageItem now supports behaviors just like ModelItem
export function ImageItem({
    id,
    url,
    transform = {},
    width = 3,
    height = 3,
    opacity = 1,
    isPaused = false,
    behaviors = [],
    registerRef,
    getObjectRefById,
}) {
    const containerRef = useRef();
    const texture = new THREE.TextureLoader().load(url);

    useEffect(() => {
        registerRef?.(id, containerRef);
        return () => registerRef?.(id, null);
    }, [id, registerRef]);

    const t = transform || {};
    return (
        <group
            ref={containerRef}
            position={[t.x || 0, t.y || 0, t.z || 0]}
            rotation={[t.rx || 0, t.ry || 0, t.rz || 0]}
            scale={[t.sx || 1, t.sy || 1, t.sz || 1]}
        >
            <mesh>
                <planeGeometry args={[width, height]} />
                <meshBasicMaterial
                    map={texture}
                    transparent={true}
                    alphaTest={0.5}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                />
            </mesh>

            {/* Behaviors now apply to images too */}
            <BehaviorRunner
                targetRef={containerRef}
                behaviors={behaviors}
                getObjectRefById={getObjectRefById}
                paused={isPaused}
            />
        </group>
    );
}

export function TextItem({ content, fontSize, color, transform = {} }) {
    const ref = useRef();
    useEffect(() => {
        if (ref.current) {
            const { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1 } = transform;
            ref.current.position.set(x, y, z);
            ref.current.rotation.set(rx, ry, rz);
            ref.current.scale.set(sx, sy, sz);
        }
    }, [transform]);
    return (
        <Text ref={ref} fontSize={fontSize || 1} color={color || 'white'}>
            {content}
        </Text>
    );
}

export function ButtonItem({ item, onPress }) {
    const ref = useRef();
    const { transform = {}, appearance = {} } = item;
    useEffect(() => {
        if (!ref.current) return;
        const { x = 0, y = 1, z = 0, rx = 0, ry = 0, rz = 0, sx = 0.4, sy = 0.2, sz = 0.1 } = transform;
        ref.current.position.set(x, y, z);
        ref.current.rotation.set(rx, ry, rz);
        ref.current.scale.set(sx, sy, sz);
    }, [transform]);
    return (
        <group
            ref={ref}
            onPointerDown={(e) => {
                e.stopPropagation();
                onPress?.(item);
            }}
        >
            <mesh>
                <boxGeometry args={[1, 0.4, 0.1]} />
                <meshStandardMaterial color="#2a6df1" />
            </mesh>
            <Text position={[0, 0, 0.06]} fontSize={0.15} color="white" anchorX="center" anchorY="middle">
                {appearance.label || 'Button'}
            </Text>
        </group>
    );
}
