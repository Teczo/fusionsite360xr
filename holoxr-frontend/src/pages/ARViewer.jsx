import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton';

function ModelItem({ url, transform }) {
    const { scene } = useGLTF(url);
    const ref = useRef();

    useEffect(() => {
        if (ref.current) {
            const { x, y, z, rx, ry, rz, sx, sy, sz } = transform;
            ref.current.position.set(x, y, z);
            ref.current.rotation.set(rx, ry, rz);
            ref.current.scale.set(sx, sy, sz);
        }
    }, [transform]);

    return <primitive ref={ref} object={scene} />;
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
                const res = await fetch(`${window.location.origin.replace('5173', '4000')}/api/published/${id}`);
                const data = await res.json();
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

                {/* Optional Ground */}
                <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
                    <planeGeometry args={[100, 100]} />
                    <meshStandardMaterial color="#dddddd" />
                </mesh>

                {sceneData.map((item) => {
                    if (item.type === 'model') {
                        return <ModelItem key={item.id} url={item.url} transform={item.transform} />;
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
