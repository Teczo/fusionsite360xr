// src/pages/ARPlane.jsx
import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import * as THREE from "three";
import { ARButton } from "three/examples/jsm/webxr/ARButton.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { unzipSync } from "fflate";

export default function ARPlane() {
    const { id } = useParams(); // /ar-plane/:id
    const containerRef = useRef(null);

    // three
    const rendererRef = useRef(null);
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);

    const reticleRef = useRef(null);
    const controller1Ref = useRef(null);
    const controller2Ref = useRef(null);

    // xr hit-test
    const hitTestSourceRef = useRef(null);
    const hitTestRequestedRef = useRef(false);

    // anchor root
    const anchorGroupRef = useRef(null);
    const placedRef = useRef(false);

    // loaders
    const gltfLoaderRef = useRef(null);
    const textureLoaderRef = useRef(null);

    // animations (future step)
    const mixersRef = useRef([]);

    const [loadingScene, setLoadingScene] = useState(false);
    const [hint, setHint] = useState("Move your phone to find a surface, then tap to place.");

    useEffect(() => {
        const container = containerRef.current;

        // scene + camera
        const scene = new THREE.Scene();
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
        cameraRef.current = camera;

        const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 3);
        light.position.set(0.5, 1, 0.25);
        scene.add(light);

        // anchor root
        const anchorGroup = new THREE.Group();
        anchorGroup.matrixAutoUpdate = false; // we’ll set its matrix from reticle when placed
        scene.add(anchorGroup);
        anchorGroupRef.current = anchorGroup;

        // renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.xr.enabled = true;
        renderer.domElement.style.touchAction = "none";
        container.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // AR button
        const arButton = ARButton.createButton(renderer, {
            requiredFeatures: ["hit-test"],
            optionalFeatures: ["dom-overlay"],
            domOverlay: { root: document.body },
        });
        if (!container.querySelector(".webxr-ar-button")) {
            arButton.classList.add("webxr-ar-button");
            container.appendChild(arButton);
        }

        // reticle
        const reticle = new THREE.Mesh(
            new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
            new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 })
        );
        reticle.matrixAutoUpdate = false;
        reticle.visible = false;
        scene.add(reticle);
        reticleRef.current = reticle;

        // controllers (AR select)
        const controller1 = renderer.xr.getController(0);
        const controller2 = renderer.xr.getController(1);
        scene.add(controller1);
        scene.add(controller2);
        controller1Ref.current = controller1;
        controller2Ref.current = controller2;

        // loaders
        const gltfLoader = new GLTFLoader();
        const draco = new DRACOLoader();
        // quick working decoder path; swap to your own if you host
        draco.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");
        gltfLoader.setDRACOLoader(draco);
        gltfLoaderRef.current = gltfLoader;

        const textureLoader = new THREE.TextureLoader();
        textureLoaderRef.current = textureLoader;

        // handle select (tap)
        async function onSelect() {
            const reticle = reticleRef.current;
            const anchorGroup = anchorGroupRef.current;
            if (!reticle || !anchorGroup || !reticle.visible) return;

            if (!placedRef.current) {
                // place anchor
                anchorGroup.matrix.copy(reticle.matrix);
                anchorGroup.matrixWorldNeedsUpdate = true;
                anchorGroup.updateMatrixWorld(true);

                // visual confirm at anchor
                anchorGroup.add(new THREE.AxesHelper(0.3));

                placedRef.current = true;
                setHint("");

                // fetch scene now
                if (!id) {
                    console.warn("[ARPlane] Missing :id in URL. Use /ar-plane/<projectId>");
                    setHint("Missing project id in URL.");
                    return;
                }

                setLoadingScene(true);
                const url = `${import.meta.env.VITE_API_URL}/api/published/${id}`;
                try {
                    console.log("[ARPlane] Fetching:", url);
                    const res = await fetch(url);
                    const data = await res.json();
                    console.log("[ARPlane] Raw API response:", data);

                    // robustly extract scene array, mirroring what ARViewer expects
                    const items = extractSceneArray(data);
                    if (!Array.isArray(items)) {
                        console.warn("[ARPlane] Could not find published scene array in payload.");
                        dropDebugCube(anchorGroup);
                        setHint("No published scene found in API response.");
                        return;
                    }

                    console.log("[ARPlane] Scene items summary:");
                    console.table(
                        items.map((it) => ({
                            id: it.id || it.name,
                            type: it.type,
                            url: it.url,
                            visible: it.visible !== false,
                            hasTransform: !!it.transform,
                        }))
                    );

                    // only load supported types in this step
                    const supported = items.filter(
                        (it) => it?.visible !== false && (it?.type === "model" || it?.type === "image")
                    );
                    if (supported.length === 0) {
                        console.warn("[ARPlane] No supported items of type model/image.");
                        dropDebugCube(anchorGroup);
                        setHint("No models/images in this project (visible=false?).");
                        return;
                    }

                    let loaded = 0;
                    for (const it of supported) {
                        try {
                            if (it.type === "model") {
                                await addModel(anchorGroup, it);
                                loaded++;
                            } else if (it.type === "image") {
                                await addImage(anchorGroup, it);
                                loaded++;
                            }
                        } catch (e) {
                            console.warn("[ARPlane] Failed to load item:", it?.id || it?.name || it, e);
                        }
                    }
                    console.log(`[ARPlane] Loaded ${loaded}/${supported.length} model/image items.`);
                    if (loaded === 0) {
                        dropDebugCube(anchorGroup);
                        setHint("Failed to load models/images (check console/CORS/URLs).");
                    }
                } catch (err) {
                    console.error("[ARPlane] Fetch error:", err);
                    setHint("Failed to fetch scene (see console).");
                } finally {
                    setLoadingScene(false);
                }
            } else {
                // (Step 3 later) allow re-tap to reposition anchorGroup if you want
            }
        }

        controller1.addEventListener("select", onSelect);
        controller2.addEventListener("select", onSelect);

        // resize
        function onWindowResize() {
            const w = window.innerWidth;
            const h = window.innerHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        }
        window.addEventListener("resize", onWindowResize);

        // loop + hit-test
        const clock = new THREE.Clock();
        renderer.setAnimationLoop((_, frame) => {
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
                            const reticle = reticleRef.current;
                            if (reticle) {
                                reticle.visible = true;
                                reticle.matrix.fromArray(pose.transform.matrix);
                            }
                        }
                    } else {
                        const reticle = reticleRef.current;
                        if (reticle) reticle.visible = false;
                    }
                }
            }

            renderer.render(scene, camera);
        });

        // cleanup
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

    // ---------- helpers ----------

    function extractSceneArray(data) {
        // Try common shapes we’ve seen across your code
        if (Array.isArray(data?.publishedScene)) return data.publishedScene;
        if (Array.isArray(data?.scene)) return data.scene;
        if (Array.isArray(data?.data?.scene)) return data.data.scene;
        if (Array.isArray(data?.data?.publishedScene)) return data.data.publishedScene;
        // Fallback: if API returned the whole project with `scene` field:
        if (data && typeof data === "object") {
            for (const key of Object.keys(data)) {
                const v = data[key];
                if (v && Array.isArray(v.scene)) return v.scene;
                if (Array.isArray(v?.publishedScene)) return v.publishedScene;
            }
        }
        return null;
    }

    function dropDebugCube(parent) {
        const cube = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.2, 0.2),
            new THREE.MeshNormalMaterial()
        );
        cube.position.set(0, 0.1, 0);
        parent.add(cube);
    }

    function applyTransform(obj, t) {
        if (!t) {
            obj.updateMatrix(); obj.updateMatrixWorld(true);
            return;
        }
        // ARViewer uses object fields: x,y,z, rx,ry,rz, sx,sy,sz
        const px = t.x ?? 0, py = t.y ?? 0, pz = t.z ?? 0;
        const rx = t.rx ?? 0, ry = t.ry ?? 0, rz = t.rz ?? 0; // radians
        const sx = t.sx ?? 1, sy = t.sy ?? 1, sz = t.sz ?? 1;

        obj.position.set(px, py, pz);
        obj.rotation.set(rx, ry, rz);
        obj.scale.set(sx, sy, sz);
        obj.updateMatrix();
        obj.updateMatrixWorld(true);
    }

    async function addModel(parent, item) {
        const gltfLoader = gltfLoaderRef.current;
        if (!gltfLoader) return;
        if (!item?.url) return;

        let srcUrl = item.url;
        let revokeUrl = null;

        // mirror ARViewer zip logic: unzip first GLB if needed
        if (srcUrl.toLowerCase().endsWith(".zip")) {
            console.log("[ARPlane] Unzipping model:", srcUrl);
            const res = await fetch(srcUrl);
            if (!res.ok) throw new Error(`Failed to fetch zip: ${srcUrl}`);
            const ab = await res.arrayBuffer();
            const zip = unzipSync(new Uint8Array(ab));
            // prefer single .glb
            const glbName = Object.keys(zip).find((n) => n.toLowerCase().endsWith(".glb"));
            if (!glbName) {
                // if only .gltf present (external buffers not handled here) -> recommend GLB in pipeline
                const gltfName = Object.keys(zip).find((n) => n.toLowerCase().endsWith(".gltf"));
                if (!gltfName) throw new Error("No .glb/.gltf inside zip");
                const gltfBlob = new Blob([zip[gltfName]], { type: "model/gltf+json" });
                srcUrl = URL.createObjectURL(gltfBlob);
                revokeUrl = srcUrl;
            } else {
                const glbBlob = new Blob([zip[glbName]], { type: "model/gltf-binary" });
                srcUrl = URL.createObjectURL(glbBlob);
                revokeUrl = srcUrl;
            }
        }

        console.log("[ARPlane] Loading GLTF:", srcUrl);
        const gltf = await gltfLoader.loadAsync(srcUrl);
        if (revokeUrl) URL.revokeObjectURL(revokeUrl);

        const root = gltf.scene || gltf.scenes?.[0];
        if (!root) return;

        root.traverse((o) => {
            if (o.isMesh) {
                o.castShadow = false;
                o.receiveShadow = false;
            }
        });

        applyTransform(root, item.transform);
        parent.add(root);
        parent.updateMatrixWorld(true);

        // (Optional Step 4) — autoplay animations if provided (parity with ModelItem)
        if (Array.isArray(gltf.animations) && gltf.animations.length) {
            const autoplay = !!item.autoplay;
            const isPaused = !!item.isPaused;
            const index = Number.isInteger(item.selectedAnimationIndex) ? item.selectedAnimationIndex : 0;

            if (autoplay && !isPaused) {
                const mixer = new THREE.AnimationMixer(root);
                const clip = gltf.animations[index] || gltf.animations[0];
                const action = mixer.clipAction(clip);
                action.play();
                mixersRef.current.push(mixer);
            }
        }
    }

    async function addImage(parent, item) {
        const textureLoader = textureLoaderRef.current;
        if (!textureLoader) return;
        if (!item?.url) return;

        console.log("[ARPlane] Loading image:", item.url);
        const tex = await textureLoader.loadAsync(item.url);
        tex.colorSpace = THREE.SRGBColorSpace;

        const geom = new THREE.PlaneGeometry(1, 1);
        const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(geom, mat);

        // respect authored scale if provided; otherwise keep 1x1 (you handle aspect in studio)
        applyTransform(mesh, item.transform);
        parent.add(mesh);
        parent.updateMatrixWorld(true);
    }

    return (
        <>
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
