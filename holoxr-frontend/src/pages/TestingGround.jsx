import { useEffect, useState, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { unzipSync } from "fflate";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import PropertyPanel from "../components/PropertyPanel";
import { useNavigate } from "react-router-dom";

export default function TestingGround() {
    const [storageItems, setStorageItems] = useState([]);
    const [scene, setScene] = useState(null);
    const [animations, setAnimations] = useState([]);
    const [selectedAnimationIndex, setSelectedAnimationIndex] = useState(0);
    const [playAnimationKey, setPlayAnimationKey] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        setStorageItems([ 
            {
                name: "🦾 Ironman",
                url: "https://holoxr.blob.core.windows.net/uploads/1749904536793-ironman.zip",
            },
            {
                name: "🦁 Baby Lion",
                url: "https://holoxr.blob.core.windows.net/uploads/1750082861837-baby_lion.zip",
            },
        ]);
    }, []);

    const loadModelFromZip = async (url) => {
        try {
            const res = await fetch(url);
            const arrayBuffer = await res.arrayBuffer();
            const zip = unzipSync(new Uint8Array(arrayBuffer));
            const glbName = Object.keys(zip).find((name) => name.endsWith(".glb"));

            if (!glbName) throw new Error("No .glb file found in ZIP");

            const blob = new Blob([zip[glbName]], { type: "model/gltf-binary" });
            const blobUrl = URL.createObjectURL(blob);

            const loader = new GLTFLoader();
            loader.load(blobUrl, (gltf) => {
                setScene(gltf.scene);
                setAnimations(gltf.animations || []);
                setSelectedAnimationIndex(0);
                setPlayAnimationKey(Date.now());
            });
        } catch (err) {
            console.error("❌ Failed to load ZIP model:", err);
        }
    };

    const updateModelTransform = (id, updates) => {
        console.log("Transform update (mocked)", updates);
        // Add local transform state handling if needed
    };

    const updateTextProperty = (id, updates) => {
        console.log("Text update (mocked)", updates);
    };

    const dummyModel = scene
        ? {
            id: "temp-model",
            type: "model",
            name: "Temporary Model",
            animations,
            selectedAnimationIndex,
            transform: {
                x: 0,
                y: 0,
                z: 0,
                rx: 0,
                ry: 0,
                rz: 0,
                sx: 1,
                sy: 1,
                sz: 1,
            },
        }
        : null;

    return (
        <div className="flex h-screen bg-[#121212] text-white">
            {/* Left panel - file list */}
            <div className="w-64 bg-[#1c1d22] p-4 overflow-y-auto border-r border-white/10">
                <h2 className="text-lg font-semibold mb-4">🧩 Storage Files</h2>
                <ul className="space-y-2">
                    {storageItems.map((item, index) => (
                        <li
                            key={index}
                            className="cursor-pointer px-3 py-2 rounded hover:bg-white/10 transition"
                            onClick={() => loadModelFromZip(item.url)}
                        >
                            {item.name}
                        </li>
                    ))}
                </ul>
            </div>

            {/* Center panel - 3D Canvas */}
            <div className="flex-1 min-w-0 relative">
                <Canvas camera={{ position: [0, 2, 6], fov: 60 }}>
                    <ambientLight intensity={0.8} />
                    <directionalLight position={[5, 10, 5]} intensity={1.5} />
                    <OrbitControls />

                    {scene && (
                        <ModelWithAnimation
                            scene={scene}
                            animations={animations}
                            selectedAnimationIndex={selectedAnimationIndex}
                            playAnimationKey={playAnimationKey}
                        />
                    )}
                </Canvas>
            </div>

            {/* Right panel - PropertyPanel */}
            <div className="w-72 bg-[#1c1d22] border-l border-white/10 overflow-y-auto">
                <PropertyPanel
                    model={dummyModel}
                    updateModelTransform={updateModelTransform}
                    updateTextProperty={updateTextProperty}
                    onPlayAnimation={() => setPlayAnimationKey(Date.now())}
                />
            </div>
        </div>
    );
}

function ModelWithAnimation({ scene, animations, selectedAnimationIndex, playAnimationKey }) {
    const ref = useRef();
    const mixerRef = useRef();

    useEffect(() => {
        if (!scene || animations.length === 0) return;

        const mixer = new THREE.AnimationMixer(scene);
        mixerRef.current = mixer;

        const clip = animations[selectedAnimationIndex];
        const action = mixer.clipAction(clip);
        action.reset().play();

        return () => mixer.stopAllAction();
    }, [scene, animations, selectedAnimationIndex, playAnimationKey]);

    useFrame((_, delta) => {
        mixerRef.current?.update(delta);
    });

    return <primitive ref={ref} object={scene} />;
}
