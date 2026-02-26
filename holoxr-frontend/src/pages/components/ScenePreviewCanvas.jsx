import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, DepthOfField, Outline, Selection, Select } from "@react-three/postprocessing";
import * as THREE from "three";

import { ModelItem } from "../../components/viewer/ARViewerComponents";
import DoFDevPanel from "../components/dev/DoFDevPanel";


export default function ScenePreviewCanvas({ projectId, cameraRequest, captureRequest, onSelectAsset, activeTool, onBimElementSelect }) {

    const [published, setPublished] = useState(null);
    const [error, setError] = useState("");
    const [selectedId, setSelectedId] = useState(null);

    const [selectedBox, setSelectedBox] = useState(null); // THREE.Box3
    const [sceneBox, setSceneBox] = useState(null);       // THREE.Box3

    // NEW: store focus distance in world units (camera-to-point)
    const [focusWorldDistance, setFocusWorldDistance] = useState(null);

    const api = import.meta.env.VITE_API_URL;
    const showDoFDevTools = import.meta.env.VITE_DOF_DEVTOOLS === "true";

    const [dofEnabled, setDofEnabled] = useState(true);
    const [dofSettings, setDofSettings] = useState({
        bokehScale: 2.0,
        focalLength: 0.02,
        focusDistance: 0.15, // normalized 0..1 default
        height: 480,
    });

    useEffect(() => {
        let cancelled = false;

        async function load() {
            if (!projectId) return;

            try {
                setError("");

                const res = await fetch(`${api}/api/published/${projectId}`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);

                const ct = res.headers.get("content-type") || "";
                if (!ct.includes("application/json")) {
                    const text = await res.text();
                    throw new Error(`Expected JSON, got HTML: ${text.slice(0, 60)}`);
                }

                const json = await res.json();
                if (!cancelled) setPublished(json);
            } catch (e) {
                if (!cancelled) setError(e.message || String(e));
            }
        }

        if (!api) {
            setError("VITE_API_URL is not set");
            return;
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [api, projectId]);

    const models = useMemo(() => {
        if (!published) return [];
        const items = published.publishedScene || published.scene || [];
        return items
            .filter((it) => it.type === "model" && it.visible !== false && typeof it.url === "string")
            .map((it) => ({
                id: it.id,
                name: it.name,
                url: it.url,
                transform: it.transform,
                autoplay: !!it.autoplay,
                isPaused: !!it.isPaused,
            }));
    }, [published]);

    if (error) {
        return (
            <div className="h-full w-full flex items-center justify-center">
                <div className="rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">
                    {error}
                </div>
            </div>
        );
    }

    if (!projectId) {
        return (
            <div className="h-full w-full flex items-center justify-center">
                <div className="rounded-xl border border-border bg-white px-4 py-3 text-sm text-textpri">
                    No project selected.
                </div>
            </div>
        );
    }

    if (!published) {
        return (
            <div className="h-full w-full flex items-center justify-center">
                <div className="rounded-xl border border-border bg-white px-4 py-3 text-sm text-textpri">
                    Loading digital twin scene…
                </div>
            </div>
        );
    }

    if (models.length === 0) {
        return (
            <div className="h-full w-full flex items-center justify-center">
                <div className="rounded-xl border border-border bg-white px-4 py-3 text-sm text-textpri">
                    No 3D models found in this scene.
                </div>
            </div>
        );
    }

    return (
        <div className="relative h-full w-full">
            <Canvas
                gl={{ preserveDrawingBuffer: true }}
                camera={{ position: [0, 2, 8], fov: 45 }}
                className="h-full w-full"
            >
                <CaptureController captureRequest={captureRequest} />

                <ambientLight intensity={0.9} />
                <directionalLight position={[10, 12, 6]} intensity={1.2} />
                <directionalLight position={[-6, 6, -4]} intensity={0.6} />



                <SceneContent
                    models={models}
                    onFocusDistance={setFocusWorldDistance}
                    selectedId={selectedId}
                    onSelect={(payload) => {
                        setSelectedId(payload.id);
                        // Don't surface asset info panel when picking in BIM mode
                        if (!payload._bimPick) onSelectAsset?.(payload);
                    }}
                    activeTool={activeTool}
                    onBimElementSelect={onBimElementSelect}
                />


                <CameraPresetsController
                    request={cameraRequest}
                    sceneBox={sceneBox}
                    selectedBox={selectedBox}
                    humanEyeHeight={1.7}
                />



                {/* DoF Post Processing
                <PostFX enabled={dofEnabled} settings={dofSettings} focusWorldDistance={focusWorldDistance} />*/}

                <OrbitControls
                    makeDefault
                    enableDamping
                    dampingFactor={0.08}
                    rotateSpeed={0.7}
                    zoomSpeed={0.9}
                    panSpeed={0.7}
                    screenSpacePanning
                />
            </Canvas>
            {showDoFDevTools && (
                <DoFDevPanel
                    enabled={dofEnabled}
                    settings={dofSettings}
                    setEnabled={setDofEnabled}
                    setSettings={setDofSettings}
                />
            )}

        </div>
    );
}

function CaptureController({ captureRequest }) {
    const { gl } = useThree();

    useEffect(() => {
        if (!captureRequest?.nonce) return;

        const raf = requestAnimationFrame(() => {
            try {
                const dataUrl = gl.domElement.toDataURL("image/png");

                const a = document.createElement("a");
                a.href = dataUrl;
                a.download = `DigitalTwin_${formatTimestampForFilename()}.png`;
                document.body.appendChild(a);
                a.click();
                a.remove();
            } catch (err) {
                console.error("Capture failed:", err);
            }
        });

        return () => cancelAnimationFrame(raf);
    }, [captureRequest?.nonce, gl]);

    return null;
}


function formatTimestampForFilename(d = new Date()) {
    const pad = (n) => String(n).padStart(2, "0");
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    const ss = pad(d.getSeconds());
    return `${yyyy}${mm}${dd}_${hh}${mi}${ss}`;
}

function SceneContent({ models, onFocusDistance, selectedId, onSelect, activeTool, onBimElementSelect }) {
    const rootRef = useRef();
    const { camera } = useThree();

    // store original emissive so we can restore cleanly
    const originalRef = useRef(new Map());

    // track currently BIM-highlighted meshes so we can reset them
    const bimHighlightRef = useRef([]);

    const categorize = (name = "") => {
        const s = name.toLowerCase();
        if (s.includes("pump")) return "Pump";
        if (s.includes("valve")) return "Valve";
        if (s.includes("hvac") || s.includes("duct")) return "HVAC";
        if (s.includes("cable") || s.includes("elect")) return "Electrical";
        if (s.includes("pipe")) return "Piping";
        return "Structure";
    };

    const mockStatus = (id = "") => {
        // deterministic but "random-looking"
        const n = [...String(id)].reduce((a, c) => a + c.charCodeAt(0), 0) % 3;
        return n === 0 ? "Healthy" : n === 1 ? "Maintenance" : "Offline";
    };

    // Save original emissive for a material (once)
    const saveOriginal = (m) => {
        if (!originalRef.current.has(m)) {
            originalRef.current.set(m, {
                emissive: m.emissive ? m.emissive.clone() : new THREE.Color(0x000000),
                emissiveIntensity: typeof m.emissiveIntensity === "number" ? m.emissiveIntensity : 0,
            });
        }
    };

    // Reset a single material to its saved original
    const resetMaterial = (m) => {
        if (!m) return;
        const orig = originalRef.current.get(m);
        if (orig && m.emissive) {
            m.emissive.copy(orig.emissive);
            m.emissiveIntensity = orig.emissiveIntensity;
            m.needsUpdate = true;
        }
    };

    // Reset all meshes in the entire root to original emissive
    const resetAllHighlights = useCallback(() => {
        const root = rootRef.current;
        if (!root) return;
        root.traverse((obj) => {
            if (!obj.isMesh) return;
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            mats.forEach((m) => { if (m) resetMaterial(m); });
        });
        bimHighlightRef.current = [];
    }, []);

    const applyTint = (group, enabled) => {
        if (!group) return;

        group.traverse((obj) => {
            if (!obj.isMesh) return;
            const mat = obj.material;
            if (!mat) return;

            // handle multi-material
            const mats = Array.isArray(mat) ? mat : [mat];

            mats.forEach((m) => {
                if (!m) return;

                // save original emissive once
                saveOriginal(m);

                const orig = originalRef.current.get(m);

                if (enabled) {
                    if (m.emissive) {
                        m.emissive.set(0x2563eb); // subtle blue tint
                        m.emissiveIntensity = 0.35;
                    }
                } else {
                    if (m.emissive && orig) {
                        m.emissive.copy(orig.emissive);
                        m.emissiveIntensity = orig.emissiveIntensity;
                    }
                }

                m.needsUpdate = true;
            });
        });
    };

    // Cursor feedback for active tool
    useEffect(() => {
        const canvas = document.querySelector('canvas');
        if (canvas) canvas.style.cursor = activeTool === 'bim' ? 'crosshair' : '';
        return () => { if (canvas) canvas.style.cursor = ''; };
    }, [activeTool]);

    // Clear BIM highlight when BIM tool is deactivated
    useEffect(() => {
        if (activeTool !== 'bim') {
            resetAllHighlights();
        }
    }, [activeTool, resetAllHighlights]);

    const handlePick = useCallback(
        (e, model) => {
            e.stopPropagation();

            // Debug logging
            console.log("Clicked mesh name:", e.object?.name);
            console.log("Model ID:", model.id);
            console.log("Model URL:", model.url);

            // Focus distance (always)
            const hitPoint = e.point?.clone?.() ?? null;
            if (hitPoint) {
                const dist = camera.position.distanceTo(hitPoint);
                onFocusDistance(dist);
            }

            // BIM tool: use mesh NAME as identity key (not GUID)
            if (activeTool === 'bim') {
                const fileName = model.name; // e.g. Fixed_platform_maintower.glb
                const baseName = fileName.replace('.glb', '');
                const normalizedName = baseName.trim().toLowerCase();

                console.log('[BIM] Using model-level name:', normalizedName);

                onBimElementSelect?.({
                    name: normalizedName,
                    originalName: baseName
                });
                console.log('[BIM] Picked mesh name:', meshName, '→ normalized:', normalizedName);

                // Reset all previous highlights, then highlight picked mesh
                resetAllHighlights();

                const pickedMesh = e.object;
                if (pickedMesh && pickedMesh.isMesh) {
                    const mats = Array.isArray(pickedMesh.material)
                        ? pickedMesh.material
                        : [pickedMesh.material];
                    mats.forEach((m) => {
                        if (!m) return;
                        saveOriginal(m);
                        if (m.emissive) {
                            m.emissive.set(0x00ffff);
                            m.emissiveIntensity = 0.8;
                            m.needsUpdate = true;
                        }
                    });
                    bimHighlightRef.current = mats.filter(Boolean);
                }

                onBimElementSelect?.({ name: normalizedName, originalName: meshName });
                // Mark as bim pick so asset panel doesn't open
                onSelect?.({ id: model.id, _bimPick: true });
                return;
            }

            // Normal mode: asset selection
            const payload = {
                id: model.id,
                name: model.name || e.object?.name || `Asset ${model.id}`,
                type: model.type || "model",
                category: categorize(model.name || e.object?.name || ""),
                status: mockStatus(model.id),
                lastUpdated: new Date().toLocaleString(),
                hint: "Currently demo data. In production, this binds to your CMMS/IoT/document systems.",
            };

            onSelect?.(payload);
        },
        [camera, onFocusDistance, onSelect, activeTool, onBimElementSelect, resetAllHighlights]
    );


    // On selection change, tint only selected model (restore others)
    useEffect(() => {
        // We tint by finding the selected group's ref via R3F tree:
        // simplest: traverse root children and match userData.assetId
        const root = rootRef.current;
        if (!root) return;

        root.children.forEach((child) => {
            const assetId = child.userData?.assetId;
            applyTint(child, assetId && assetId === selectedId);
        });
    }, [selectedId]);

    return (
        <group ref={rootRef}>
            {models.map((m) => (
                <Select key={m.id} enabled={selectedId === m.id}>
                    <group
                        userData={{ assetId: m.id }}
                        onPointerDown={(e) => handlePick(e, m)}
                    >
                        <ModelItem
                            id={m.id}
                            url={m.url}
                            transform={m.transform}
                            autoplay={m.autoplay}
                            isPaused={m.isPaused}
                            behaviors={[]}
                        />
                    </group>
                </Select>
            ))}

            <AutoFitCamera targetRef={rootRef} />
        </group>
    );
}




function PostFX({ focusWorldDistance }) {
    const { camera } = useThree();

    // Convert world distance -> normalized 0..1 focusDistance used by DepthOfField
    // 0 = near plane, 1 = far plane
    const focusDistance = useMemo(() => {
        if (focusWorldDistance == null) return 0.15; // default focus
        const n = camera.near;
        const f = camera.far;
        const t = (focusWorldDistance - n) / (f - n);
        return THREE.MathUtils.clamp(t, 0, 1);
    }, [focusWorldDistance, camera.near, camera.far]);

    return (


        <Selection>
            <EffectComposer>
                {dofEnabled && (
                    <DepthOfField
                        focusDistance={dofSettings.focusDistance}
                        focalLength={dofSettings.focalLength}
                        bokehScale={dofSettings.bokehScale}
                        height={dofSettings.height}
                    />
                )}

                <Outline
                    edgeStrength={2.5}
                    pulseSpeed={0.0}
                    visibleEdgeColor={0x2563eb}
                    hiddenEdgeColor={0x2563eb}
                    blur
                />
            </EffectComposer>
        </Selection>

    );
}

function AutoFitCamera({ targetRef }) {
    const { camera, controls } = useThree();

    useEffect(() => {
        let raf;

        const fit = () => {
            const root = targetRef.current;
            if (!root) return;

            const box = new THREE.Box3().setFromObject(root);
            if (box.isEmpty()) {
                raf = requestAnimationFrame(fit);
                return;
            }

            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());

            const maxDim = Math.max(size.x, size.y, size.z);
            const fov = THREE.MathUtils.degToRad(camera.fov);
            let distance = maxDim / (2 * Math.tan(fov / 2));
            distance *= 1.4;

            camera.position.set(center.x + distance, center.y + distance * 0.4, center.z + distance);
            camera.near = Math.max(0.01, distance / 100);
            camera.far = distance * 100;
            camera.updateProjectionMatrix();

            if (controls) {
                controls.target.copy(center);
                controls.update();
            }
        };

        raf = requestAnimationFrame(fit);
        return () => cancelAnimationFrame(raf);
    }, [camera, controls, targetRef]);

    return null;
}

function CameraPresetsController({ request, sceneBox, selectedBox, humanEyeHeight = 1.7 }) {
    const { camera, controls } = useThree();
    const tweenRef = useRef(null);

    const startTween = useCallback((toPos, toTarget, duration = 650) => {
        if (!controls) return;

        const fromPos = camera.position.clone();
        const fromTarget = controls.target.clone();

        tweenRef.current = {
            t0: performance.now(),
            duration,
            fromPos,
            toPos: toPos.clone(),
            fromTarget,
            toTarget: toTarget.clone(),
        };
    }, [camera, controls]);

    useEffect(() => {
        if (!request?.type || !controls) return;

        const type = request.type;

        const getBoxCenterSize = (box) => {
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            return { center, size };
        };

        const fitToBox = (box, azimuth = 45, elevation = 20, pad = 1.35) => {
            const { center, size } = getBoxCenterSize(box);
            const maxDim = Math.max(size.x, size.y, size.z);

            const fov = THREE.MathUtils.degToRad(camera.fov);
            let dist = maxDim / (2 * Math.tan(fov / 2));
            dist *= pad;

            const az = THREE.MathUtils.degToRad(azimuth);
            const el = THREE.MathUtils.degToRad(elevation);

            const dir = new THREE.Vector3(
                Math.cos(el) * Math.cos(az),
                Math.sin(el),
                Math.cos(el) * Math.sin(az)
            );

            const pos = center.clone().add(dir.multiplyScalar(dist));
            return { pos, target: center };
        };

        // Defaults if sceneBox isn't ready yet
        const fallbackBox = new THREE.Box3(
            new THREE.Vector3(-2, -2, -2),
            new THREE.Vector3(2, 2, 2)
        );

        const boxForScene = sceneBox && !sceneBox.isEmpty() ? sceneBox : fallbackBox;

        if (type === "overview") {
            const { pos, target } = fitToBox(boxForScene, 45, 50, .8);
            startTween(pos, target);
            return;
        }

        if (type === "top") {
            const { center, size } = getBoxCenterSize(boxForScene);
            const maxDim = Math.max(size.x, size.y, size.z);
            const dist = maxDim * 1.2 + 2.0;
            const pos = new THREE.Vector3(center.x, center.y + dist, center.z + 0.001);
            startTween(pos, center);
            return;
        }

        if (type === "side") {
            const { center, size } = getBoxCenterSize(boxForScene);
            const maxDim = Math.max(size.x, size.y, size.z);
            const dist = maxDim * 1.2 + 2.0;
            const pos = new THREE.Vector3(center.x + dist, center.y + maxDim * 0.15, center.z);
            startTween(pos, center);
            return;
        }

        if (type === "ground") {
            const { center, size } = getBoxCenterSize(boxForScene);
            const maxDim = Math.max(size.x, size.y, size.z);

            const eye = new THREE.Vector3(center.x, humanEyeHeight, center.z + maxDim * 1.2 + 2.5);
            const lookAt = new THREE.Vector3(center.x, Math.max(0.6, humanEyeHeight * 0.6), center.z);
            startTween(eye, lookAt);
            return;
        }

        if (type === "focus") {
            const box = selectedBox && !selectedBox.isEmpty() ? selectedBox : boxForScene;
            const { pos, target } = fitToBox(box, 35, 18, 1.25);
            startTween(pos, target);
            return;
        }
    }, [request?.nonce, request?.type, sceneBox, selectedBox, startTween, camera.fov, controls, humanEyeHeight]);

    // Animate every frame
    useEffect(() => {
        let raf;

        const tick = () => {
            const tw = tweenRef.current;
            if (tw && controls) {
                const now = performance.now();
                const u = Math.min(1, (now - tw.t0) / tw.duration);

                // Smoothstep easing
                const t = u * u * (3 - 2 * u);

                camera.position.lerpVectors(tw.fromPos, tw.toPos, t);
                controls.target.lerpVectors(tw.fromTarget, tw.toTarget, t);

                controls.update();

                if (u >= 1) tweenRef.current = null;
            }
            raf = requestAnimationFrame(tick);
        };

        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [camera, controls]);

    return null;
}
