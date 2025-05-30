import { useEffect, useState, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

function AnimatedModel({ url }) {
    const { scene, animations } = useGLTF(url);
    const ref = useRef();
    const mixerRef = useRef();

    useEffect(() => {
        if (!animations.length) {
            console.warn('No animations found in model:', url);
            return;
        }

        const mixer = new THREE.AnimationMixer(scene);
        mixerRef.current = mixer;

        const clip = animations[0];
        const action = mixer.clipAction(clip);
        action.reset().play();

        return () => mixer.stopAllAction();
    }, [scene, animations]);

    useFrame((_, delta) => {
        mixerRef.current?.update(delta);
    });

    return <primitive ref={ref} object={scene} />;
}

export default function AnimationTest() {
    const [models, setModels] = useState([]);
    const [selectedModelUrl, setSelectedModelUrl] = useState(null);

    useEffect(() => {
        const fetchModels = async () => {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/api/files`);
                const data = await res.json();
                const onlyModels = data.filter((item) => item.type === 'model');
                setModels(onlyModels);
            } catch (err) {
                console.error('Failed to fetch models:', err);
            }
        };

        fetchModels();
    }, []);

    return (
        <div className="flex h-screen">
            {/* Sidebar */}
            <div className="w-64 border-r p-4 overflow-y-auto">
                <h2 className="text-lg font-semibold mb-4">Uploaded Models</h2>
                {models.map((model) => (
                    <button
                        key={model.url}
                        onClick={() => setSelectedModelUrl(model.url)}
                        className="block w-full text-left mb-2 px-3 py-1 rounded bg-gray-200 hover:bg-gray-300"
                    >
                        {model.name}
                    </button>
                ))}
            </div>

            {/* Canvas */}
            <div className="flex-1">
                <Canvas camera={{ position: [0, 1.5, 4], fov: 60 }}>
                    <ambientLight intensity={0.5} />
                    <directionalLight position={[5, 5, 5]} intensity={1} />
                    <OrbitControls />
                    {selectedModelUrl && <AnimatedModel url={selectedModelUrl} />}
                </Canvas>
            </div>
        </div>
    );
}
