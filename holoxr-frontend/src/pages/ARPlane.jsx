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

    // animations
    const mixersRef = useRef([]);                 // update each frame
    const animMapRef = useRef(new Map());         // id -> { mixer, clips, actionsByIndex, currentAction, currentIndex, root }
    const itemIndexRef = useRef(new Map());       // id -> original item (to read selectedAnimationIndex)

    // interactions
    const interactiveRef = useRef([]);            // clickable meshes/groups
    const objectIndexRef = useRef(new Map());     // id -> Object3D
    const raycasterRef = useRef(new THREE.Raycaster());
    const lastTapNDCRef = useRef(null);           // normalized device coords

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
        anchorGroup.matrixAutoUpdate = false; // driven by reticle on placement
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

        // capture touch (for raycast after placement)
        const onTouchStart = (e) => {
            if (!placedRef.current) return;
            if (e.touches && e.touches[0]) {
                const t = e.touches[0];
                lastTapNDCRef.current = new THREE.Vector2(
                    (t.clientX / window.innerWidth) * 2 - 1,
                    -(t.clientY / window.innerHeight) * 2 + 1
                );
                e.preventDefault();
            }
        };
        renderer.domElement.addEventListener("touchstart", onTouchStart, { passive: false });

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
        draco.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");
        gltfLoader.setDRACOLoader(draco);
        gltfLoaderRef.current = gltfLoader;

        const textureLoader = new THREE.TextureLoader();
        textureLoaderRef.current = textureLoader;

        // handle select (tap)
        async function onSelect() {
            const ret = reticleRef.current;
            const anchorGroup = anchorGroupRef.current;
            if (!anchorGroup) return;

            // First tap: place & fetch
            if (!placedRef.current) {
                if (!ret || !ret.visible) return;

                anchorGroup.matrix.copy(ret.matrix);
                anchorGroup.matrixWorldNeedsUpdate = true;
                anchorGroup.updateMatrixWorld(true);

                anchorGroup.add(new THREE.AxesHelper(0.3)); // visual confirm
                placedRef.current = true;
                setHint("");

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

                    // Support: model/image/text/button (labels/quiz later)
                    const supported = items.filter(
                        (it) =>
                            it?.visible !== false &&
                            (it?.type === "model" || it?.type === "image" || it?.type === "text" || it?.type === "button")
                    );

                    let loaded = 0;
                    for (const it of supported) {
                        try {
                            itemIndexRef.current.set(it.id, it);
                            if (it.type === "model") {
                                await addModel(anchorGroup, it);
                                loaded++;
                            } else if (it.type === "image") {
                                await addImage(anchorGroup, it);
                                loaded++;
                            } else if (it.type === "text") {
                                await addText(anchorGroup, it);
                                loaded++;
                            } else if (it.type === "button") {
                                await addButton(anchorGroup, it);
                                loaded++;
                            }
                        } catch (e) {
                            console.warn("[ARPlane] Failed to load item:", it?.id || it?.name || it, e);
                        }
                    }
                    console.log(`[ARPlane] Loaded ${loaded}/${supported.length} items.`);
                    if (loaded === 0) {
                        dropDebugCube(anchorGroup);
                        setHint("Failed to load items (check console/CORS/URLs).");
                    }
                } catch (err) {
                    console.error("[ARPlane] Fetch error:", err);
                    setHint("Failed to fetch scene (see console).");
                } finally {
                    setLoadingScene(false);
                }
                return;
            }

            // After placement: treat tap as interaction (raycast)
            const cam = cameraRef.current;
            const ndc = lastTapNDCRef.current || new THREE.Vector2(0, 0); // center fallback
            const raycaster = raycasterRef.current;
            raycaster.setFromCamera(ndc, cam);

            const hits = raycaster.intersectObjects(interactiveRef.current, true);
            if (hits.length) {
                const hit = hits[0].object;
                // walk up to button root if needed
                let node = hit;
                while (node && !node.userData?.buttonRoot) node = node.parent;
                const root = node || hit;
                const item = root.userData?.item;
                if (item) handleButtonPress(item);
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
                        interactiveRef.current = [];
                        objectIndexRef.current.clear();
                        animMapRef.current.clear();
                        itemIndexRef.current.clear();
                    });

                    hitTestRequestedRef.current = true;
                }

                if (hitTestSourceRef.current) {
                    const hitTestResults = frame.getHitTestResults(hitTestSourceRef.current);
                    if (hitTestResults.length > 0) {
                        const hit = hitTestResults[0];
                        const pose = hit.getPose(referenceSpace);
                        if (pose) {
                            const ret = reticleRef.current;
                            if (ret) {
                                ret.visible = true;
                                ret.matrix.fromArray(pose.transform.matrix);
                            }
                        }
                    } else {
                        const ret = reticleRef.current;
                        if (ret) ret.visible = false;
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
            renderer.domElement.removeEventListener("touchstart", onTouchStart);

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
        if (Array.isArray(data?.publishedScene)) return data.publishedScene;
        if (Array.isArray(data?.scene)) return data.scene;
        if (Array.isArray(data?.data?.scene)) return data.data.scene;
        if (Array.isArray(data?.data?.publishedScene)) return data.data.publishedScene;
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
        const px = t.x ?? 0, py = t.y ?? 0, pz = t.z ?? 0;
        const rx = t.rx ?? 0, ry = t.ry ?? 0, rz = t.rz ?? 0; // radians
        const sx = t.sx ?? 1, sy = t.sy ?? 1, sz = t.sz ?? 1;

        obj.position.set(px, py, pz);
        obj.rotation.set(rx, ry, rz);
        obj.scale.set(sx, sy, sz);
        obj.updateMatrix();
        obj.updateMatrixWorld(true);
    }

    function handleButtonPress(item) {
        const actions = item?.interactions || [];
        for (const act of actions) {
            if (!act?.type) continue;

            if (act.type === "toggleVisibility" && act.targetId) {
                toggleVisibilityById(act.targetId);

            } else if (act.type === "changeProject" && act.projectId) {
                window.location.href = `/ar-plane/${act.projectId}`;

            } else if (act.type === "playPauseAnimation" && act.targetId) {
                // mode: "play" | "pause" | undefined (toggle)
                const mode = act.mode;
                const clipIndexFromAction = Number.isInteger(act.index) ? act.index : undefined;
                playPauseAnimationById(act.targetId, mode, clipIndexFromAction);
            }

            // (add more: openClosePanel, etc.)
        }
    }

    function toggleVisibilityById(targetId) {
        const obj = objectIndexRef.current.get(targetId);
        if (obj) {
            obj.visible = !obj.visible;
            obj.updateMatrixWorld(true);
        } else {
            console.warn("[ARPlane] toggleVisibility: no object found for id", targetId);
        }
    }

    function ensureActionForIndex(animator, index) {
        animator.actionsByIndex ||= [];
        let action = animator.actionsByIndex[index];
        if (!action) {
            action = animator.mixer.clipAction(animator.clips[index], animator.root);
            animator.actionsByIndex[index] = action;
        }
        return action;
    }

    function playPauseAnimationById(targetId, mode, idxOverride) {
        const animator = animMapRef.current.get(targetId);
        if (!animator) {
            console.warn("[ARPlane] playPauseAnimation: no animator found for id", targetId);
            return;
        }
        if (!animator.clips?.length) {
            console.warn("[ARPlane] playPauseAnimation: animator has no clips", targetId);
            return;
        }

        // Decide which index to use: action override -> item.selectedAnimationIndex -> 0
        let index = idxOverride;
        if (!Number.isInteger(index)) {
            const item = itemIndexRef.current.get(targetId);
            index = Number.isInteger(item?.selectedAnimationIndex) ? item.selectedAnimationIndex : 0;
        }
        index = Math.max(0, Math.min(animator.clips.length - 1, index));

        const action = ensureActionForIndex(animator, index);

        // If switching clips, stop previous
        if (animator.currentAction && animator.currentAction !== action) {
            animator.currentAction.stop();
        }

        if (mode === "play") {
            action.paused = false;
            action.play();
            animator.currentAction = action;
            animator.currentIndex = index;
            return;
        }
        if (mode === "pause") {
            // If never played, start then immediately pause for consistent state
            action.play();
            action.paused = true;
            animator.currentAction = action;
            animator.currentIndex = index;
            return;
        }

        // toggle
        // If never played before, start it
        if (!animator.currentAction) {
            action.paused = false;
            action.play();
            animator.currentAction = action;
            animator.currentIndex = index;
            return;
        }

        // Flip paused state
        const target = action;
        target.paused = !target.paused;
        if (!target.paused) target.play();
        animator.currentAction = target;
        animator.currentIndex = index;
    }

    async function addModel(parent, item) {
        const gltfLoader = gltfLoaderRef.current;
        if (!gltfLoader || !item?.url) return;

        let srcUrl = item.url;
        let revokeUrl = null;

        // .zip -> .glb/.gltf blob
        if (srcUrl.toLowerCase().endsWith(".zip")) {
            console.log("[ARPlane] Unzipping model:", srcUrl);
            const res = await fetch(srcUrl);
            if (!res.ok) throw new Error(`Failed to fetch zip: ${srcUrl}`);
            const ab = await res.arrayBuffer();
            const zip = unzipSync(new Uint8Array(ab));

            const glbName = Object.keys(zip).find((n) => n.toLowerCase().endsWith(".glb"));
            if (!glbName) {
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
        root.userData.id = item.id;
        parent.add(root);
        parent.updateMatrixWorld(true);

        objectIndexRef.current.set(item.id, root);

        // Animation setup (play/pause support)
        if (Array.isArray(gltf.animations) && gltf.animations.length) {
            const mixer = new THREE.AnimationMixer(root);
            mixersRef.current.push(mixer);

            const animator = {
                mixer,
                clips: gltf.animations,
                actionsByIndex: [],
                currentAction: null,
                currentIndex: -1,
                root
            };
            animMapRef.current.set(item.id, animator);

            // Autoplay if requested and not paused
            const autoplay = !!item.autoplay;
            const initiallyPaused = !!item.isPaused;
            const initialIndex = Number.isInteger(item.selectedAnimationIndex) ? item.selectedAnimationIndex : 0;

            if (autoplay && !initiallyPaused) {
                const idx = Math.max(0, Math.min(animator.clips.length - 1, initialIndex));
                const action = ensureActionForIndex(animator, idx);
                action.paused = false;
                action.play();
                animator.currentAction = action;
                animator.currentIndex = idx;
            } else if (autoplay && initiallyPaused) {
                // Prepare action but keep it paused
                const idx = Math.max(0, Math.min(animator.clips.length - 1, initialIndex));
                const action = ensureActionForIndex(animator, idx);
                action.play();
                action.paused = true;
                animator.currentAction = action;
                animator.currentIndex = idx;
            }
        }
    }

    async function addImage(parent, item) {
        const textureLoader = textureLoaderRef.current;
        if (!textureLoader || !item?.url) return;

        console.log("[ARPlane] Loading image:", item.url);
        const tex = await textureLoader.loadAsync(item.url);
        tex.colorSpace = THREE.SRGBColorSpace;

        const geom = new THREE.PlaneGeometry(1, 1);
        const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(geom, mat);

        applyTransform(mesh, item.transform);
        mesh.userData.id = item.id;
        parent.add(mesh);
        parent.updateMatrixWorld(true);

        objectIndexRef.current.set(item.id, mesh);
    }

    function makeTextTexture(text, color = "#ffffff", px = 64) {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const padding = 24;
        ctx.font = `bold ${px}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
        const metrics = ctx.measureText(text || "");
        const width = Math.ceil(metrics.width) + padding * 2;
        const height = Math.ceil(px * 1.6) + padding * 2;
        canvas.width = Math.max(2, width);
        canvas.height = Math.max(2, height);

        const ctx2 = canvas.getContext("2d");
        ctx2.font = `bold ${px}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
        ctx2.fillStyle = color;
        ctx2.textBaseline = "middle";
        ctx2.textAlign = "left";
        ctx2.fillText(text || "", padding, canvas.height / 2);

        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        return { tex, width: canvas.width, height: canvas.height };
    }

    async function addText(parent, item) {
        const content = item.content || item.name || "Text";
        const color = item.color || "#ffffff";
        const px = Math.max(24, Math.round((item.fontSize || 0.12) * 280));

        const { tex, width, height } = makeTextTexture(content, color, px);
        const aspect = width / height;
        const geom = new THREE.PlaneGeometry(1, 1 / aspect);
        const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(geom, mat);

        applyTransform(mesh, item.transform);
        mesh.userData.id = item.id;
        parent.add(mesh);
        parent.updateMatrixWorld(true);

        objectIndexRef.current.set(item.id, mesh);
    }

    async function addButton(parent, item) {
        const group = new THREE.Group();

        const body = new THREE.Mesh(
            new THREE.BoxGeometry(0.40, 0.12, 0.02),
            new THREE.MeshStandardMaterial({ color: "#2563eb", roughness: 0.8, metalness: 0.0 })
        );
        body.position.set(0, 0, 0);
        body.userData.buttonRoot = true;
        group.add(body);

        const labelText = item.name || "Button";
        const { tex, width, height } = makeTextTexture(labelText, "#ffffff", 56);
        const label = new THREE.Mesh(
            new THREE.PlaneGeometry(0.36, 0.36 * (height / width)),
            new THREE.MeshBasicMaterial({ map: tex, transparent: true })
        );
        label.position.set(0, 0, 0.012);
        label.userData.buttonRoot = true;
        group.add(label);

        group.userData.item = item;       // for actions
        group.userData.buttonRoot = true;
        applyTransform(group, item.transform);
        group.userData.id = item.id;

        parent.add(group);
        parent.updateMatrixWorld(true);

        objectIndexRef.current.set(item.id, group);
        interactiveRef.current.push(group);
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
