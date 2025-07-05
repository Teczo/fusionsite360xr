import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { unzipSync } from 'fflate';

function ModelItem({ url, transform, selectedAnimationIndex = 0, autoplay = false }) {
    const mixerRef = useRef();
    const [scene, setScene] = useState(null);
    const [animations, setAnimations] = useState([]);

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
            loader.load(
                blobUrl,
                (gltf) => {
                    setScene(gltf.scene);
                    setAnimations(gltf.animations);
                },
                undefined,
                (err) => console.error('❌ GLB load error:', err)
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
        mixerRef.current?.update(delta);
    });

    if (!scene) return null;

    return (
        <group
            position={[transform?.x || 0, transform?.y || 0, transform?.z || 0]}
            rotation={[transform?.rx || 0, transform?.ry || 0, transform?.rz || 0]}
            scale={[transform?.sx || 1, transform?.sy || 1, transform?.sz || 1]}
        >
            <primitive object={scene} />
        </group>
    );
}

function ImageItem({ url, transform }) {
    const texture = new THREE.TextureLoader().load(url);
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
        <mesh ref={ref}>
            <planeGeometry args={[3, 3]} />
            <meshBasicMaterial map={texture} />
        </mesh>
    );
}

function TextItem({ content, fontSize, color, transform }) {
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
        <Text ref={ref} fontSize={fontSize || 1} color={color || 'white'}>
            {content}
        </Text>
    );
}

export default function ARViewer() {
    const { id } = useParams();
    const [sceneData, setSceneData] = useState([]);

    useEffect(() => {
        const fetchScene = async () => {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/api/published/${id}`);
                const data = await res.json();
                console.log("📦 AR Scene Data:", data);
                if (res.ok && data.publishedScene) {
                    setSceneData(data.publishedScene);
                }
            } catch (err) {
                console.error('Failed to load published scene', err);
            }
        };

        fetchScene();
    }, [id]);

    return (
        <div className="w-screen h-screen">
            <Canvas
                camera={{ position: [0, 1.6, 3], fov: 70 }}
                onCreated={({ gl }) => {
                    gl.xr.enabled = true;
                    const button = ARButton.createButton(gl, { requiredFeatures: ['hit-test'] });
                    document.body.appendChild(button);
                }}
            >
                <ambientLight intensity={0.5} />
                <directionalLight position={[5, 5, 5]} intensity={1} />
                <OrbitControls />

                <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
                    <planeGeometry args={[100, 100]} />
                    <meshStandardMaterial color="#dddddd" />
                </mesh>

                {sceneData.map((item) => {
                    if (item.type === 'model') {
                        return (
                            <ModelItem
                                key={item.id}
                                url={item.url}
                                transform={item.transform}
                                selectedAnimationIndex={item.selectedAnimationIndex}
                                autoplay={item.autoplay}
                            />
                        );
                    } else if (item.type === 'image') {
                        return <ImageItem key={item.id} url={item.url} transform={item.transform} />;
                    } else if (item.type === 'text') {
                        return (
                            <TextItem
                                key={item.id}
                                content={item.content}
                                fontSize={item.fontSize}
                                color={item.color}
                                transform={item.transform}
                            />
                        );
                    }
                    return null;
                })}
            </Canvas>
        </div>
    );
}
