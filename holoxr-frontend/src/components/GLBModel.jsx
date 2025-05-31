import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { TransformControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

export default function GLBModel({
    url,
    name,
    id,
    transform,
    selectedModelId,
    setSelectedModelId,
    transformMode,
    updateModelTransform,
    handleFocusObject,
    selectedAnimationIndex,
    playAnimationKey,
    onLoaded
}) {
    const { scene, animations } = useGLTF(url);
    const ref = useRef();
    const mixerRef = useRef();

    useEffect(() => {
        const delay = Math.random() * 300 + 100; // random 100-400ms delay
        const timeout = setTimeout(() => {
            if (onLoaded) onLoaded();
        }, delay);

        return () => clearTimeout(timeout);
    }, []);



    useEffect(() => {
        if (ref.current) {
            const { x, y, z, rx, ry, rz, sx, sy, sz } = transform;
            ref.current.position.set(x, y, z);
            ref.current.rotation.set(rx, ry, rz);
            ref.current.scale.set(sx, sy, sz);
        }
    }, [transform]);

    useEffect(() => {
        if (!animations.length) return;
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

    useFrame((_, delta) => {
        mixerRef.current?.update(delta);
    });

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