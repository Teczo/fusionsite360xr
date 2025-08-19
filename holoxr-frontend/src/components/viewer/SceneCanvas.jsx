// src/viewer/SceneCanvas.jsx
import React, { useRef, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text } from "@react-three/drei";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { unzip } from 'fflate';
import UILabel3D from "../Items/UILabel3D";
import Quiz3D from "../Items/Quiz3D";

function ModelItem({ item, onModelLoaded, onObjectTap }) {
    const { url, transform, selectedAnimationIndex = 0, autoplay = false, isPaused = false } = item;
    const mixerRef = useRef();
    const sceneRef = useRef();
    const animsRef = useRef([]);

    useEffect(() => {
        if (!url) return;
        let blobUrl = url;
        let revoked = false;

        (async () => {
            try {
                if (url.endsWith('.zip')) {
                    const res = await fetch(url);
                    const buf = new Uint8Array(await res.arrayBuffer());
                    const files = await new Promise((resolve, reject) => unzip(buf, (err, out) => (err ? reject(err) : resolve(out))));
                    const glbName = Object.keys(files).find(n => n.toLowerCase().endsWith('.glb'));
                    if (!glbName) throw new Error('No .glb in zip');
                    const blob = new Blob([files[glbName]], { type: 'model/gltf-binary' });
                    blobUrl = URL.createObjectURL(blob);
                }
                const loader = new GLTFLoader();
                loader.load(
                    blobUrl,
                    (gltf) => {
                        sceneRef.current = gltf.scene;
                        animsRef.current = gltf.animations || [];
                        onModelLoaded?.({ id: item.id, animations: animsRef.current.map(a => a.name) });
                    },
                    undefined,
                    (err) => console.error("❌ GLB load error:", err)
                );
            } catch (e) {
                console.error("Model load error", e);
            }
        })();

        return () => {
            if (blobUrl !== url && !revoked) {
                URL.revokeObjectURL(blobUrl);
                revoked = true;
            }
        };
    }, [url, item.id, onModelLoaded]);

    useEffect(() => {
        if (!sceneRef.current || !autoplay || animsRef.current.length === 0) return;
        const mixer = new THREE.AnimationMixer(sceneRef.current);
        mixerRef.current = mixer;
        const clip = animsRef.current[selectedAnimationIndex] || animsRef.current[0];
        const action = mixer.clipAction(clip);
        action.reset().play();
        return () => {
            mixer.stopAllAction();
            mixer.uncacheRoot(sceneRef.current);
        };
    }, [autoplay, selectedAnimationIndex]);

    useFrame((_, dt) => {
        if (!isPaused) mixerRef.current?.update(dt);
    });

    if (!sceneRef.current) return null;
    const t = transform || {};
    return (
        <group
            position={[t.x || 0, t.y || 0, t.z || 0]}
            rotation={[t.rx || 0, t.ry || 0, t.rz || 0]}
            scale={[t.sx || 1, t.sy || 1, t.sz || 1]}
            onPointerDown={(e) => {
                e.stopPropagation();
                onObjectTap?.(item);
            }}
        >
            <primitive object={sceneRef.current} />
        </group>
    );
}

function ImageItem({ item, onObjectTap }) {
    const { url, transform = {} } = item;
    const tex = new THREE.TextureLoader().load(url);
    const ref = useRef();
    useEffect(() => {
        if (!ref.current) return;
        const { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1 } = transform;
        ref.current.position.set(x, y, z); ref.current.rotation.set(rx, ry, rz); ref.current.scale.set(sx, sy, sz);
    }, [transform]);
    return (
        <mesh
            ref={ref}
            onPointerDown={(e) => { e.stopPropagation(); onObjectTap?.(item); }}
        >
            <planeGeometry args={[3, 3]} />
            <meshBasicMaterial map={tex} />
        </mesh>
    );
}

function TextItem({ item, onObjectTap }) {
    const { content, fontSize, color, transform = {} } = item;
    const ref = useRef();
    useEffect(() => {
        if (!ref.current) return;
        const { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1 } = transform;
        ref.current.position.set(x, y, z); ref.current.rotation.set(rx, ry, rz); ref.current.scale.set(sx, sy, sz);
    }, [transform]);
    return (
        <Text
            ref={ref}
            fontSize={fontSize || 1}
            color={color || "white"}
            onPointerDown={(e) => { e.stopPropagation(); onObjectTap?.(item); }}
        >
            {content}
        </Text>
    );
}

function ButtonItem({ item, onCTA }) {
    const ref = useRef();
    const { transform = {}, appearance = {} } = item;
    useEffect(() => {
        if (!ref.current) return;
        const { x = 0, y = 1, z = 0, rx = 0, ry = 0, rz = 0, sx = 0.4, sy = 0.2, sz = 0.1 } = transform;
        ref.current.position.set(x, y, z); ref.current.rotation.set(rx, ry, rz); ref.current.scale.set(sx, sy, sz);
    }, [transform]);

    return (
        <group
            ref={ref}
            onPointerDown={(e) => {
                e.stopPropagation();
                onCTA?.(item);
            }}
        >
            <mesh>
                <boxGeometry args={[1, 0.4, 0.1]} />
                <meshStandardMaterial color="#2a6df1" />
            </mesh>
            <Text position={[0, 0, 0.06]} fontSize={0.15} color="white" anchorX="center" anchorY="middle">
                {appearance.label || "Button"}
            </Text>
        </group>
    );
}

export default function SceneCanvas({
    sceneData,
    isAR,
    onActionRun,
    onCTA,
    onQuizAttempt,
    onModelLoaded,
    onObjectTap,            // NEW
}) {
    return (
        <Canvas
            dpr={[1, 1.5]}       // perf: cap DPR
            camera={{ position: [0, 1.6, 3], fov: 70 }}
            gl={{
                antialias: false,  // perf: big win on mobile
                powerPreference: "high-performance",
                alpha: true,
                stencil: false,
            }}
        >
            <ambientLight intensity={0.5} />
            <directionalLight position={[5, 5, 5]} intensity={1} />
            {!isAR && <OrbitControls />}

            {sceneData.map(item => {
                if (item.visible === false) return null;

                if (item.type === "model") {
                    return <ModelItem key={item.id} item={item} onModelLoaded={onModelLoaded} onObjectTap={onObjectTap} />;
                }
                if (item.type === "image") {
                    return <ImageItem key={item.id} item={item} onObjectTap={onObjectTap} />;
                }
                if (item.type === "text") {
                    return <TextItem key={item.id} item={item} onObjectTap={onObjectTap} />;
                }
                if (item.type === "button") {
                    return <ButtonItem key={item.id} item={item} onCTA={onCTA} />;
                }
                if (item.type === "label") {
                    return (
                        <UILabel3D
                            key={item.id}
                            id={item.id}
                            name={item.name}
                            content={item.content}
                            fontSize={item.fontSize}
                            color={item.color}
                            appearance={item.appearance}
                            transform={item.transform}
                            lineMode={item.lineMode || "none"}
                            targetId={item.targetId || null}
                            anchorPoint={item.anchorPoint || null}
                            models={sceneData}
                            selectedModelId={null}
                            transformMode="none"
                            isPreviewing={true}
                        />
                    );
                }
                if (item.type === "quiz") {
                    return (
                        <Quiz3D
                            key={item.id}
                            id={item.id}
                            name={item.name}
                            quiz={item.quiz}
                            transform={item.transform}
                            appearance={item.appearance}
                            selectedModelId={null}
                            setSelectedModelId={() => { }}
                            transformMode="none"
                            isPreviewing={true}
                            orbitRef={null}
                            updateModelTransform={() => { }}
                            onAttempt={(res) => onQuizAttempt?.({ item, ...res })}
                        />
                    );
                }
                return null;
            })}
        </Canvas>
    );
}
