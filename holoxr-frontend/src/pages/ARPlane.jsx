// src/pages/ARPlane.jsx
import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { ARButton } from "three/examples/jsm/webxr/ARButton.js";

export default function ARPlane() {
    const containerRef = useRef(null);

    // Three.js refs
    const rendererRef = useRef(null);
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const reticleRef = useRef(null);
    const controller1Ref = useRef(null);
    const controller2Ref = useRef(null);

    // Hit-test state refs
    const hitTestSourceRef = useRef(null);
    const hitTestRequestedRef = useRef(false);

    // Reusable geometry for spawned meshes
    const cylinderGeoRef = useRef(null);

    useEffect(() => {
        const container = containerRef.current;

        // --- Scene / Camera ---
        const scene = new THREE.Scene();
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(
            70,
            window.innerWidth / window.innerHeight,
            0.01,
            20
        );
        cameraRef.current = camera;

        const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 3);
        light.position.set(0.5, 1, 0.25);
        scene.add(light);

        // --- Renderer ---
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.xr.enabled = true;
        renderer.domElement.style.touchAction = "none";
        container.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // --- AR Button ---
        const arButton = ARButton.createButton(renderer, {
            requiredFeatures: ["hit-test"],
        });
        // Avoid duplicates if hot-reloaded
        if (!container.querySelector(".webxr-ar-button")) {
            arButton.classList.add("webxr-ar-button");
            container.appendChild(arButton);
        }

        // --- Reticle ---
        const reticle = new THREE.Mesh(
            new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
            new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 })
        );
        reticle.matrixAutoUpdate = false;
        reticle.visible = false;
        scene.add(reticle);
        reticleRef.current = reticle;

        // --- Controllers (for AR "select" taps) ---
        const controller1 = renderer.xr.getController(0);
        const controller2 = renderer.xr.getController(1);
        controller1Ref.current = controller1;
        controller2Ref.current = controller2;
        scene.add(controller1);
        scene.add(controller2);

        // Spawn geometry (translated so it sits on the plane)
        cylinderGeoRef.current = new THREE.CylinderGeometry(0.1, 0.1, 0.2, 32).translate(0, 0.1, 0);

        function onSelect() {
            if (!reticle.visible) return;

            const material = new THREE.MeshPhongMaterial({ color: Math.random() * 0xffffff });
            const mesh = new THREE.Mesh(cylinderGeoRef.current, material);

            // Place the mesh at reticle pose
            reticle.matrix.decompose(mesh.position, mesh.quaternion, mesh.scale);
            mesh.scale.y = Math.random() * 2 + 1;
            scene.add(mesh);
        }

        controller1.addEventListener("select", onSelect);
        controller2.addEventListener("select", onSelect);

        // --- Resize ---
        function onWindowResize() {
            const w = window.innerWidth;
            const h = window.innerHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        }
        window.addEventListener("resize", onWindowResize);

        // --- Animation loop with hit-test logic (same as the sample) ---
        renderer.setAnimationLoop((timestamp, frame) => {
            if (frame) {
                const referenceSpace = renderer.xr.getReferenceSpace();
                const session = renderer.xr.getSession();

                if (!hitTestRequestedRef.current) {
                    // Request a hit-test source from the viewer space
                    session.requestReferenceSpace("viewer").then((viewerRefSpace) => {
                        session.requestHitTestSource({ space: viewerRefSpace }).then((source) => {
                            hitTestSourceRef.current = source;
                        });
                    });

                    session.addEventListener("end", () => {
                        hitTestRequestedRef.current = false;
                        hitTestSourceRef.current = null;
                    });

                    hitTestRequestedRef.current = true;
                }

                if (hitTestSourceRef.current) {
                    const hitTestResults = frame.getHitTestResults(hitTestSourceRef.current);
                    if (hitTestResults.length > 0) {
                        const hit = hitTestResults[0];
                        const pose = hit.getPose(referenceSpace);
                        if (pose) {
                            reticle.visible = true;
                            reticle.matrix.fromArray(pose.transform.matrix);
                        }
                    } else {
                        reticle.visible = false;
                    }
                }
            }

            renderer.render(scene, camera);
        });

        // --- Cleanup ---
        return () => {
            window.removeEventListener("resize", onWindowResize);
            controller1.removeEventListener("select", onSelect);
            controller2.removeEventListener("select", onSelect);

            renderer.setAnimationLoop(null);
            const canvas = renderer.domElement;
            if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);

            // Remove AR button if we added it
            const btn = container.querySelector(".webxr-ar-button");
            if (btn) btn.remove();

            // Dispose scene resources
            scene.traverse((obj) => {
                if (obj.isMesh) {
                    obj.geometry?.dispose?.();
                    if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose?.());
                    else obj.material?.dispose?.();
                }
            });

            renderer.dispose();
        };
    }, []);

    return (
        <div
            ref={containerRef}
            style={{
                width: "100vw",
                height: "100vh",
                overflow: "hidden",
                position: "fixed",
                inset: 0,
                background: "transparent",
            }}
        />
    );
}
