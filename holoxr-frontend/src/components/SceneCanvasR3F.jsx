import SceneContent from './SceneContent';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useRef, useState } from 'react';
import * as THREE from 'three';

export default function SceneCanvasR3F({ items, selectedModelId, setSelectedModelId, updateModelTransform }) {
    const [transformMode, setTransformMode] = useState('translate');
    const [resetSignal, setResetSignal] = useState(0);

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

    const FloatingPanel = () => (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-white bg-opacity-80 px-4 py-1 rounded shadow flex gap-2">
            {['translate', 'rotate', 'scale', 'none'].map((mode) => (
                <button
                    key={mode}
                    onClick={() => setTransformMode(mode)}
                    className={`text-sm px-2 py-1 rounded ${transformMode === mode
                        ? 'bg-gray-50 text-gray-800 hover:bg-gray-100'
                        : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                        }`}
                >
                    {mode === 'translate' && 'Move'}
                    {mode === 'rotate' && 'Rotate'}
                    {mode === 'scale' && 'Scale'}
                    {mode === 'none' && 'Hide'}
                </button>
            ))}
            <button
                onClick={handleResetView}
                className="text-sm px-2 py-1 rounded bg-gray-200 text-gray-800 hover:bg-gray-300"
            >
                Reset View
            </button>
        </div>
    );

    return (
        <div className="w-full h-full relative">
            <FloatingPanel />

            <Canvas camera={{ position: [0, 2, 10], fov: 60 }} ref={cameraRef}>
                <ambientLight intensity={0.5} />
                <directionalLight position={[5, 5, 5]} intensity={1} />
                <OrbitControls makeDefault />
                <CameraController resetSignal={resetSignal} />

                <SceneContent
                    items={items}
                    selectedModelId={selectedModelId}
                    setSelectedModelId={setSelectedModelId}
                    transformMode={transformMode}
                    updateModelTransform={updateModelTransform}
                    handleFocusObject={handleFocusObject}
                />
            </Canvas>
        </div>
    );
}
