import SceneContent from './SceneContent';
import { Canvas, useThree } from '@react-three/fiber';
import { Grid, OrbitControls, Html } from '@react-three/drei';
import { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import FloatingPanel from './FloatingPanel';


export default function SceneCanvasR3F({ items,
    selectedModelId,
    setSelectedModelId,
    updateModelTransform,
    onPlayAnimation }) {
    const [transformMode, setTransformMode] = useState('translate');
    const [resetSignal, setResetSignal] = useState(0);

    const [loadedCount, setLoadedCount] = useState(0);
    const modelCount = items.filter((i) => i.type === 'model').length;

    const [displayedProgress, setDisplayedProgress] = useState(0);
    const [showOverlay, setShowOverlay] = useState(true);

    const handleModelLoaded = () => {
        setLoadedCount((prev) => prev + 1);
    };

    useEffect(() => {
        const target = modelCount === 0 ? 100 : Math.round((loadedCount / modelCount) * 100);
        const interval = setInterval(() => {
            setDisplayedProgress((current) => {
                if (current < target) return current + 1;
                clearInterval(interval);
                return current;
            });
        }, 15);
        return () => clearInterval(interval);
    }, [loadedCount, modelCount]);

    useEffect(() => {
        if (displayedProgress >= 100) {
            const timeout = setTimeout(() => setShowOverlay(false), 500);
            return () => clearTimeout(timeout);
        } else {
            setShowOverlay(true);
        }
    }, [displayedProgress]);
    function CameraController({ resetSignal }) {
        const { camera } = useThree();
        const resetRef = useRef(resetSignal);

        if (resetSignal !== resetRef.current) {
            camera.position.set(0, 2, 10);
            camera.lookAt(0, 0, 0);
            resetRef.current = resetSignal;
        }

        return null;
    }

    const handleResetView = () => {
        setResetSignal((prev) => prev + 1);
    };

    const handleFocusObject = (ref) => {
        const { camera } = cameraRef.current;
        if (!ref?.current) return;

        const object = ref.current;
        const bbox = new THREE.Box3().setFromObject(object);
        const center = new THREE.Vector3();
        bbox.getCenter(center);

        const size = new THREE.Vector3();
        bbox.getSize(size);
        const offset = Math.max(size.x, size.y, size.z) * 2;

        const direction = new THREE.Vector3(0, 0, 1);
        const newPosition = center.clone().add(direction.multiplyScalar(offset));

        camera.position.copy(newPosition);
        camera.lookAt(center);
    };



    const cameraRef = useRef();



    return (
        <div className="w-full h-full relative">
            {/* Loading Overlay */}
            {showOverlay && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white bg-opacity-80">
                    <p className="text-sm text-gray-700 mb-2">
                        Loading models... {loadedCount} / {modelCount}
                    </p>
                    <div className="w-64 h-2 bg-white/20 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-500 transition-all duration-300 ease-out"
                            style={{ width: `${displayedProgress}%` }}
                        ></div>
                    </div>
                </div>
            )}
            <FloatingPanel
                transformMode={transformMode}
                setTransformMode={setTransformMode}
                onResetView={handleResetView}
            />


            <Canvas
                camera={{ position: [0, 2, 10], fov: 60 }}
                shadows
                dpr={[1, 2]}
                gl={{ preserveDrawingBuffer: true }}
                style={{ background: '#0a0c0d' }}
            >
                <ambientLight intensity={0.5} />
                <directionalLight position={[5, 5, 5]} intensity={1} />
                <OrbitControls makeDefault />
                <CameraController resetSignal={resetSignal} />
                <Grid
                    args={[10, 10]}
                    cellSize={0.5}
                    cellThickness={0.5}
                    sectionSize={5}
                    sectionThickness={1.5}
                    sectionColor={'#6f6f6f'}
                    cellColor={'#444'}
                    fadeDistance={30}
                    fadeStrength={1}
                    infiniteGrid={true}
                />

                <SceneContent
                    items={items}
                    selectedModelId={selectedModelId}
                    setSelectedModelId={setSelectedModelId}
                    transformMode={transformMode}
                    updateModelTransform={updateModelTransform}
                    handleFocusObject={handleFocusObject}
                    onModelLoaded={handleModelLoaded}
                />
            </Canvas>

        </div>
    );
}
