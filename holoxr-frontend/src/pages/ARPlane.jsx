// src/pages/ARPlane.jsx
import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import * as THREE from "three";
import { ARButton } from "three/examples/jsm/webxr/ARButton.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

export default function ARPlane() {
    const { id } = useParams(); // project id
    const containerRef = useRef(null);

    // Three.js refs
    const rendererRef = useRef(null);
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const reticleRef = useRef(null);
    const controller1Ref = useRef(null);
    const controller2Ref = useRef(null);

    // Hit-test state
    const hitTestSourceRef = useRef(null);
    const hitTestRequestedRef = useRef(false);

    // Anchor root for the whole scene (set on first tap)
    const anchorGroupRef = useRef(null);
    const placedRef = useRef(false);

    // Loaders
    const gltfLoaderRef = useRef(null);
    const textureLoaderRef = useRef(null);

    // Mixers for possible future animations (Step 4)
    const mixersRef = useRef([]);

    const [loadingScene, setLoadingScene] = useState(false);
    const [hint, setHint] = useState("Move your phone to find a surface, then tap to place.");

    useEffect(() => {
        const container = containerRef.current;

        // --- Scene / Camera ---
        const scene = new THREE.Scene();
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
        cameraRef.current = camera;

        const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 3);
        light.position.set(0.5, 1, 0.25);
        scene.add(light);

        // Anchor group (content attaches here after placement)
        const anchorGroup = new THREE.Group();
        anchorGroup.matrixAutoUpdate = false; // driven by reticle matrix when placed
        scene.add(anchorGroup);
        anchorGroupRef.current = anchorGroup;

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
            optionalFeatures: ["dom-overlay"],
            domOverlay: { root: document.body },
        });
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

        // --- Controllers ---
        const controller1 = renderer.xr.getController(0);
        const controller2 = renderer.xr.getController(1);
        controller1Ref.current = controller1;
        controller2Ref.current = controller2;
        scene.add(controller1);
        scene.add(controller2);

        // --- Loaders (GLTF + optional Draco, and textures) ---
        const gltfLoader = new GLTFLoader();
        const draco = new DRACOLoader();
        // Use Google’s hosted decoders (works out-of-the-box). If you host your own, change this path.
        draco.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");
        gltfLoader.setDRACOLoader(draco);
        gltfLoaderRef.current = gltfLoader;

        const textureLoader = new THREE.TextureLoader();
        textureLoaderRef.current = textureLoader;

        // --- Handle AR "select" (tap) ---
        async function onSelect() {
            const reticle = reticleRef.current;
            const anchorGroup = anchorGroupRef.current;
            if (!reticle || !anchorGroup || !reticle.visible) return;

            // First tap -> place anchor group and fetch scene
            if (!placedRef.current) {
                anchorGroup.matrix.copy(reticle.matrix);
                placedRef.current = true;
                setHint(""); // hide hint
                if (id) {
                    setLoadingScene(true);
                    try {
                        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/published/${id}`);
                        const data = await res.json();
                        if (res.ok && data?.publishedScene?.length) {
                            await addPublishedSceneToAnchor(data.publishedScene, anchorGroup);
                        } else {
                            console.warn("No publishedScene found for id:", id, data);
                        }
                    } catch (err) {
                        console.error("Failed to fetch published scene:", err);
                    } finally {
                        setLoadingScene(false);
                    }
                } else {
                    console.warn("No :id provided in route. Use /ar-plane/<projectId>");
                }
                return;
            }

            // (Optional) Later in Step 3, we can reposition the group here.
            // For now, do nothing on subsequent taps.
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

        // --- Animation loop with hit-test ---
        const clock = new THREE.Clock();
        renderer.setAnimationLoop((timestamp, frame) => {
            // Update mixers if we add animations later (Step 4)
            const dt = clock.getDelta();
            for (const m of mixersRef.current) m.update(dt);

            if (frame) {
                const referenceSpace = renderer.xr.getReferenceSpace();
                const session = renderer.xr.getSession();

                if (!hitTestRequestedRef.current) {
                    session.requestReferenceSpace("viewer").then((viewerRefSpace) => {
                        session.requestHitTestSource({ space: viewerRefSpace }).then((source) => {
                            hitTestSourceRef.current = source;
                        });
                    });

                    session.addEventListener("end", () => {
                        hitTestRequestedRef.current = false;
                        hitTestSourceRef.current = null;
                        placedRef.current = false;
                        setHint("Move your phone to find a surface, then tap to place.");
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
            const btn = container.querySelector(".webxr-ar-button");
            if (btn) btn.remove();

            scene.traverse((obj) => {
                if (obj.isMesh) {
                    obj.geometry?.dispose?.();
                    if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose?.());
                    else obj.material?.dispose?.();
                }
            });

            renderer.dispose();
        };
    }, [id]);

    // --- helpers ---

    function applyTransformFromItem(obj, transform) {
        if (!transform) return;
        const p = transform.position ?? transform.pos ?? [0, 0, 0];
        const r = transform.rotation ?? [0, 0, 0]; // assumed radians
        const s = transform.scale ?? [1, 1, 1];

        if (Array.isArray(p) && p.length === 3) obj.position.set(p[0], p[1], p[2]);
        if (Array.isArray(r) && r.length === 3) obj.rotation.set(r[0], r[1], r[2]);
        if (Array.isArray(s) && s.length === 3) obj.scale.set(s[0], s[1], s[2]);

        obj.updateMatrix();
        obj.updateMatrixWorld(true);
    }

    async function addPublishedSceneToAnchor(items, anchorGroup) {
        // Minimal support: model + image
        for (const item of items) {
            try {
                if (item?.visible === false) continue;
                if (item?.type === "model" && item?.url) {
                    await addModel(anchorGroup, item);
                } else if (item?.type === "image" && item?.url) {
                    await addImage(anchorGroup, item);
                }
                // Other types (text/labels/quiz/buttons) will come in later steps.
            } catch (e) {
                console.warn("Failed to add item:", item?.id || item?.name || item, e);
            }
        }
    }

    async function addModel(parent, item) {
        const gltfLoader = gltfLoaderRef.current;
        if (!gltfLoader) return;

        const gltf = await gltfLoader.loadAsync(item.url);
        const root = gltf.scene || gltf.scenes?.[0];
        if (!root) return;

        // Optional: set cast/receive shadow per your pipeline
        root.traverse((o) => {
            if (o.isMesh) {
                o.castShadow = false;
                o.receiveShadow = false;
            }
        });

        applyTransformFromItem(root, item.transform);
        parent.add(root);

        // (Step 4 later): set up mixers for animations if gltf.animations?.length
        // const mixer = new THREE.AnimationMixer(root); ...
    }

    async function addImage(parent, item) {
        const textureLoader = textureLoaderRef.current;
        if (!textureLoader) return;

        const tex = await textureLoader.loadAsync(item.url);
        tex.colorSpace = THREE.SRGBColorSpace;

        // Make a unit plane and scale via transform (so authoring scale is respected)
        const geom = new THREE.PlaneGeometry(1, 1);
        // Keep alpha if PNG
        const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(geom, mat);

        // If you’d like to keep image aspect automatically when no scale provided:
        // If transform.scale is missing or [1,1,1], scale to image aspect.
        const hasCustomScale =
            item?.transform?.scale && Array.isArray(item.transform.scale) && item.transform.scale.some((v) => v !== 1);
        if (!hasCustomScale && tex.image && tex.image.width && tex.image.height) {
            const aspect = tex.image.width / tex.image.height;
            mesh.scale.set(aspect, 1, 1);
        }

        applyTransformFromItem(mesh, item.transform);
        parent.add(mesh);
    }

    return (
        <>
            {/* Canvas container */}
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
            {/* Simple DOM overlay hint */}
            {hint && (
                <div
                    style={{
                        position: "fixed",
                        left: 0,
                        right: 0,
                        bottom: 24,
                        textAlign: "center",
                        pointerEvents: "none",
                        fontFamily: "system-ui, sans-serif",
                    }}
                >
                    <span
                        style={{
                            display: "inline-block",
                            background: "rgba(0,0,0,0.6)",
                            color: "#fff",
                            padding: "10px 14px",
                            borderRadius: 12,
                        }}
                    >
                        {hint}
                    </span>
                </div>
            )}
            {loadingScene && (
                <div
                    style={{
                        position: "fixed",
                        left: 0,
                        right: 0,
                        bottom: 24,
                        textAlign: "center",
                        pointerEvents: "none",
                        fontFamily: "system-ui, sans-serif",
                    }}
                >
                    <span
                        style={{
                            display: "inline-block",
                            background: "rgba(0,0,0,0.6)",
                            color: "#fff",
                            padding: "10px 14px",
                            borderRadius: 12,
                        }}
                    >
                        Loading scene…
                    </span>
                </div>
            )}
        </>
    );
}
