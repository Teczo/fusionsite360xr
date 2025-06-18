import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { TransformControls } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';
import { unzipSync } from 'fflate';

export default function GLBModel({
    id,
    url,
    scene: providedScene, // ✅ Sketchfab may pass this
    name,
    transform,
    selectedModelId,
    setSelectedModelId,
    transformMode,
    updateModelTransform,
    handleFocusObject,
    selectedAnimationIndex,
    playAnimationKey,
    isPaused,
    onLoaded
}) {
    const ref = useRef();
    const mixerRef = useRef();
    const [blobUrl, setBlobUrl] = useState(null);
    const [scene, setScene] = useState(providedScene || null); // ✅ Default to provided scene
    const [animations, setAnimations] = useState([]);

    // 🔄 Unzip if needed and generate blob URL
    useEffect(() => {
        if (!url || providedScene) return; // ✅ Skip loading if we already have a scene

        if (!url.endsWith('.zip')) {
            setBlobUrl(url);
            return;
        }

        fetch(url)
            .then(res => res.arrayBuffer())
            .then(buf => {
                const zip = unzipSync(new Uint8Array(buf));
                const glbName = Object.keys(zip).find(name => name.endsWith('.glb'));
                if (!glbName) throw new Error('No .glb found in .zip');

                const blob = new Blob([zip[glbName]], { type: 'model/gltf-binary' });
                const objectUrl = URL.createObjectURL(blob);
                setBlobUrl(objectUrl);
            })
            .catch(err => {
                console.error('❌ Failed to unzip and prepare GLB:', err);
                setBlobUrl(null);
            });
    }, [url, providedScene]);

    // ⏳ Load model from blob if needed
    useEffect(() => {
        if (providedScene || !blobUrl || !blobUrl.startsWith('blob:')) return;

        const loader = new GLTFLoader();
        loader.load(
            blobUrl,
            (gltf) => {
                setScene(gltf.scene);
                setAnimations(gltf.animations || []);
                if (onLoaded) {
                    const animationNames = (gltf.animations || []).map(a => a.name);
                    onLoaded({ animations: animationNames });
                }
            },
            undefined,
            (err) => {
                console.error('❌ Failed to load GLB model:', err);
            }
        );
    }, [blobUrl, providedScene]);

    // 🎮 Animation setup
    useEffect(() => {
        if (!scene || !animations.length) return;

        const mixer = new THREE.AnimationMixer(scene);
        mixerRef.current = mixer;

        const clip = animations[selectedAnimationIndex] || animations[0];
        const action = mixer.clipAction(clip);
        action.reset().play();

        return () => {
            mixer.stopAllAction();
            mixer.uncacheRoot(scene);
        };
    }, [scene, animations, selectedAnimationIndex, playAnimationKey]);

    // 🔁 Animation update loop
    useFrame((_, delta) => {
        if (!isPaused) {
            mixerRef.current?.update(delta);
        }
    });

    // 📦 Apply transform
    useEffect(() => {
        if (ref.current && transform) {
            const { x, y, z, rx, ry, rz, sx, sy, sz } = transform;
            ref.current.position.set(x, y, z);
            ref.current.rotation.set(rx, ry, rz);
            ref.current.scale.set(sx, sy, sz);
        }
    }, [transform, scene]);

    if (!scene) return null;

    return (
        <>
            <primitive
                ref={ref}
                object={scene}
                onClick={(e) => {
                    e.stopPropagation();
                    setSelectedModelId(id);
                }}
                onDoubleClick={(e) => {
                    e.stopPropagation();
                    handleFocusObject(ref);
                }}
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