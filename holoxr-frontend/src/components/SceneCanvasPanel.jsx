import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';

export default function SceneCanvasPanel({ models, setModels, selectedModelId, setSelectedModelId, onAddLibraryItem }) {
  const mountRef = useRef();
  const sceneRef = useRef(new THREE.Scene());
  const cameraRef = useRef();
  const rendererRef = useRef();
  const transformControlsRef = useRef();
  const meshMapRef = useRef(new Map());
  const [transformMode, setTransformMode] = useState('translate');

  useEffect(() => {
    const currentMount = mountRef.current;
    const scene = sceneRef.current;

    const camera = new THREE.PerspectiveCamera(75, currentMount.clientWidth / currentMount.clientHeight, 0.1, 1000);
    camera.position.z = 5;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    currentMount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const light = new THREE.AmbientLight(0xffffff, 1);
    scene.add(light);

    const orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true;

    const transformControls = new TransformControls(camera, renderer.domElement);
    scene.add(transformControls);
    transformControlsRef.current = transformControls;

    transformControls.addEventListener('dragging-changed', (e) => {
      orbitControls.enabled = !e.value;
    });

    transformControls.addEventListener('objectChange', () => {
      const selectedObject = transformControls.object;
      if (!selectedObject) return;

      const modelId = [...meshMapRef.current.entries()].find(([, obj]) => obj === selectedObject)?.[0];
      if (!modelId) return;

      setModels((prev) =>
        prev.map((model) =>
          model.id === modelId
            ? {
              ...model,
              transform: {
                x: selectedObject.position.x,
                y: selectedObject.position.y,
                z: selectedObject.position.z,
                rx: selectedObject.rotation.x,
                ry: selectedObject.rotation.y,
                rz: selectedObject.rotation.z,
                sx: selectedObject.scale.x,
                sy: selectedObject.scale.y,
                sz: selectedObject.scale.z,
              },
            }
            : model
        )
      );
    });

    const animate = () => {
      requestAnimationFrame(animate);
      orbitControls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      currentMount.removeChild(renderer.domElement);
    };
  }, [setModels]);

  useEffect(() => {
    if (!onAddLibraryItem) return;

    onAddLibraryItem.current = {
      addModelFromLibrary: (item) => {
        const scene = sceneRef.current;
        const id = Date.now().toString();

        if (item.type === 'model') {
          const loader = new GLTFLoader();
          loader.load(item.url, (gltf) => {
            const model = gltf.scene;
            model.position.set(0, 0, 0);
            scene.add(model);

            let meshToAttach = model;
            model.traverse((child) => {
              if (child.isMesh && !meshToAttach.isMesh) {
                meshToAttach = child;
              }
            });

            meshMapRef.current.set(id, meshToAttach);

            setModels((prev) => [
              ...prev,
              {
                id,
                name: item.name,
                type: 'model',
                transform: {
                  x: 0, y: 0, z: 0,
                  rx: 0, ry: 0, rz: 0,
                  sx: 1, sy: 1, sz: 1,
                },
              },
            ]);

            setSelectedModelId(id);
          });
        }

        if (item.type === 'image') {
          const loader = new THREE.TextureLoader();
          loader.load(item.url, (texture) => {
            const material = new THREE.MeshBasicMaterial({ map: texture });
            const geometry = new THREE.PlaneGeometry(3, 3);
            const mesh = new THREE.Mesh(geometry, material);
            scene.add(mesh);
            meshMapRef.current.set(id, mesh);

            setModels((prev) => [
              ...prev,
              {
                id,
                name: item.name,
                type: 'image',
                transform: {
                  x: 0, y: 0, z: 0,
                  rx: 0, ry: 0, rz: 0,
                  sx: 1, sy: 1, sz: 1,
                },
              },
            ]);

            setSelectedModelId(id);
          });
        }
      },

      deleteModelById: (id) => {
        const obj = meshMapRef.current.get(id);
        if (obj) {
          sceneRef.current.remove(obj);

          obj.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) child.material.forEach(mat => mat.dispose());
              else child.material.dispose();
            }
          });

          meshMapRef.current.delete(id);
        }

        setModels(prev => prev.filter(m => m.id !== id));
        setSelectedModelId(prev => (prev === id ? null : prev));
      }
    };
  }, [onAddLibraryItem, setModels, setSelectedModelId]);

  useEffect(() => {
    models.forEach((model) => {
      const obj = meshMapRef.current.get(model.id);
      if (obj) {
        obj.position.set(model.transform.x, model.transform.y, model.transform.z);
        obj.rotation.set(model.transform.rx, model.transform.ry, model.transform.rz);
        obj.scale.set(model.transform.sx, model.transform.sy, model.transform.sz);
      }
    });
  }, [models]);

  useEffect(() => {
    const controls = transformControlsRef.current;
    const selectedMesh = meshMapRef.current.get(selectedModelId);

    if (!controls) return;

    controls.detach();

    if (transformMode === 'none') return;

    if (selectedMesh && selectedMesh.isObject3D) {
      controls.setMode(transformMode);
      controls.attach(selectedMesh);
    }
  }, [transformMode, selectedModelId]);

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-white bg-opacity-80 px-4 py-1 rounded shadow flex gap-2">
        {['translate', 'rotate', 'scale', 'none'].map((mode) => (
          <button
            key={mode}
            onClick={() => setTransformMode(mode)}
            className={`text-sm px-2 py-1 rounded ${transformMode === mode
                ? 'bg-black text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
          >
            {mode === 'translate' && 'Move'}
            {mode === 'rotate' && 'Rotate'}
            {mode === 'scale' && 'Scale'}
            {mode === 'none' && 'Hide'}
          </button>
        ))}
      </div>
      <div ref={mountRef} className="w-full h-full" />
    </div>
  );
}
