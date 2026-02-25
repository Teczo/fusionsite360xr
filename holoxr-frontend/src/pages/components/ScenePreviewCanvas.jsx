import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { EffectComposer, Outline, Selection, Select } from "@react-three/postprocessing";
import * as THREE from "three";

import { ModelItem } from "../../components/viewer/ARViewerComponents";
import DoFDevPanel from "../components/dev/DoFDevPanel";
import IssuePin from "../../components/twin/IssuePin";
import FilterPanel from "../../components/ProjectModules/FilterPanel";


// ─── Unit conversion utility ─────────────────────────────────────────────────
// Assumes world units = meters (confirm GLB export scale matches)
function convertDistance(distance, unit) {
    switch (unit) {
        case "cm": return distance * 100;
        case "meter": return distance;
        case "kilometer": return distance / 1000;
        case "inch": return distance * 39.3701;
        case "feet": return distance * 3.28084;
        default: return distance;
    }
}

const UNIT_LABELS = {
    cm: "cm",
    meter: "m",
    kilometer: "km",
    inch: "in",
    feet: "ft",
};

// Cycle of border/bg colour pairs for measurement cards
const CARD_COLORS = [
    "border-blue-500/40 bg-blue-500/5",
    "border-emerald-500/40 bg-emerald-500/5",
    "border-violet-500/40 bg-violet-500/5",
    "border-amber-500/40 bg-amber-500/5",
    "border-rose-500/40 bg-rose-500/5",
];


// ─── Category helper ──────────────────────────────────────────────────────────
function categorize(name = "") {
    const s = name.toLowerCase();
    if (s.includes("pump")) return "Pump";
    if (s.includes("valve")) return "Valve";
    if (s.includes("hvac") || s.includes("duct")) return "HVAC";
    if (s.includes("cable") || s.includes("elect")) return "Electrical";
    if (s.includes("pipe")) return "Piping";
    return "Structure";
}


// ─── MeasurementPanel ─────────────────────────────────────────────────────────
function MeasurementPanel({ unit, setUnit, measurements, onDelete, onClearAll }) {
    const handleCopy = (m) => {
        const label = UNIT_LABELS[unit];
        const dist = convertDistance(m.distance, unit).toFixed(2);
        const text = [
            `Length: ${dist} ${label}`,
            `A: (${m.pointA.x.toFixed(3)}, ${m.pointA.y.toFixed(3)}, ${m.pointA.z.toFixed(3)})`,
            `B: (${m.pointB.x.toFixed(3)}, ${m.pointB.y.toFixed(3)}, ${m.pointB.z.toFixed(3)})`,
        ].join("\n");
        navigator.clipboard?.writeText(text);
    };

    return (
        <div className="absolute right-5 top-5 w-80 bg-[#0F172A]/95 backdrop-blur border border-white/10 rounded-2xl p-4 text-white z-20">

            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold">Measure</h2>
                {measurements.length > 0 && (
                    <button
                        onClick={onClearAll}
                        className="text-white/40 hover:text-red-400 text-xs transition-colors"
                    >
                        Clear all
                    </button>
                )}
            </div>

            {/* Units Dropdown */}
            <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm mb-4 outline-none focus:border-white/30"
            >
                <option value="cm">Centimeter</option>
                <option value="meter">Meter</option>
                <option value="kilometer">Kilometer</option>
                <option value="inch">Inch</option>
                <option value="feet">Feet</option>
            </select>

            {/* Empty state hint */}
            {measurements.length === 0 ? (
                <p className="text-white/30 text-xs text-center py-4">
                    Click two points on the model to measure
                </p>
            ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {measurements.map((m, i) => (
                        <div
                            key={m.id}
                            className={`border rounded-xl p-3 ${CARD_COLORS[i % CARD_COLORS.length]}`}
                        >
                            {/* Card header row */}
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-white/50 font-medium uppercase tracking-wide">
                                    #{i + 1} Length
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleCopy(m)}
                                        className="text-white/30 hover:text-white/70 text-xs transition-colors"
                                        title="Copy to clipboard"
                                    >
                                        Copy
                                    </button>
                                    <button
                                        onClick={() => onDelete(m.id)}
                                        className="text-white/30 hover:text-red-400 text-xs transition-colors"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>

                            {/* Distance value */}
                            <div className="text-lg font-semibold mb-2">
                                {convertDistance(m.distance, unit).toFixed(2)}{" "}
                                <span className="text-sm font-normal text-white/60">
                                    {UNIT_LABELS[unit]}
                                </span>
                            </div>

                            {/* Coordinates */}
                            <div className="space-y-1 text-xs text-white/40 font-mono">
                                <div>
                                    A&nbsp;({m.pointA.x.toFixed(2)},&nbsp;
                                    {m.pointA.y.toFixed(2)},&nbsp;
                                    {m.pointA.z.toFixed(2)})
                                </div>
                                <div>
                                    B&nbsp;({m.pointB.x.toFixed(2)},&nbsp;
                                    {m.pointB.y.toFixed(2)},&nbsp;
                                    {m.pointB.z.toFixed(2)})
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}


// ─── Main component ───────────────────────────────────────────────────────────
export default function ScenePreviewCanvas({
    projectId,
    cameraRequest,
    captureRequest,
    onSelectAsset,
    activeTool,
    onBimElementSelect,
    // Issue props passed from TwinPage
    issues,
    selectedIssueId,
    onIssuePinClick,
    pendingIssuePosition,
    setPendingIssuePosition,
}) {

    const [published, setPublished] = useState(null);
    const [error, setError] = useState("");
    const [selectedId, setSelectedId] = useState(null);

    // ── Measurement state ──────────────────────────────────────────────────────
    // measurements  : completed measurement objects [{id, pointA, pointB, distance}]
    // currentPoints : in-progress clicks for the next measurement (0 or 1 point)
    // unit          : selected display unit, shared with the panel
    const [measurements, setMeasurements] = useState([]);
    const [currentPoints, setCurrentPoints] = useState([]);
    const [unit, setUnit] = useState("cm");

    const [selectedBox, setSelectedBox] = useState(null); // THREE.Box3
    const [sceneBox, setSceneBox] = useState(null); // THREE.Box3

    const [focusWorldDistance, setFocusWorldDistance] = useState(null);

    const api = import.meta.env.VITE_API_URL;
    const showDoFDevTools = import.meta.env.VITE_DOF_DEVTOOLS === "true";

    const [dofEnabled, setDofEnabled] = useState(true);
    const [dofSettings, setDofSettings] = useState({
        bokehScale: 2.0,
        focalLength: 0.02,
        focusDistance: 0.15,
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
        return () => { cancelled = true; };
    }, [api, projectId]);

    // ── Filter state ───────────────────────────────────────────────────────────
    // Unified per-category visual state: { visible, opacity, highlighted }.
    // dimOthers: when true, non-highlighted categories are dimmed to 0.15 opacity.
    const [categoryState, setCategoryState] = useState({});
    const [dimOthers, setDimOthers] = useState(false);

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

    // Unique categories derived from loaded models — updates when project changes.
    const categories = useMemo(() => {
        const set = new Set();
        models.forEach(m => set.add(categorize(m.name)));
        return Array.from(set).sort();
    }, [models]);
    // Initialise categoryState whenever the category list changes (project load /
    // project switch). Preserves existing per-category values when a category
    // is still present in the new scene.
    useEffect(() => {
        setCategoryState(prev => {
            const next = {};
            categories.forEach(cat => {
                next[cat] = prev[cat] ?? { visible: true, opacity: 1, highlighted: false };
            });
            return next;
        });
    }, [categories]);

    // Reset all filter state when the user switches away from the filter tool.
    useEffect(() => {
        if (activeTool !== "filter") {
            setCategoryState(prev => {
                const reset = {};
                Object.keys(prev).forEach(cat => {
                    reset[cat] = { visible: true, opacity: 1, highlighted: false };
                });
                return reset;
            });
            setDimOthers(false);
        }
    }, [activeTool]);

    // Clear in-progress pick when switching away from the measure tool.
    // Completed measurements are intentionally kept until explicitly deleted.
    useEffect(() => {
        if (activeTool !== "measure") {
            setCurrentPoints([]);
        }
    }, [activeTool]);





    // Model count per category — passed to FilterPanel for display.
    const categoryCounts = useMemo(() => {
        const counts = {};
        models.forEach(m => {
            const cat = categorize(m.name);
            counts[cat] = (counts[cat] || 0) + 1;
        });
        return counts;
    }, [models]);

    const handleSelect = useCallback(
        (payload) => {
            setSelectedId(payload.id);
            if (!payload._bimPick) onSelectAsset?.(payload);
        },
        [onSelectAsset]
    );

    useEffect(() => {
        if (activeTool !== "bim") {
            setSelectedId(null);
        }
    }, [activeTool]);

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
                <div className="rounded-xl border border-[#E6EAF0] bg-white px-4 py-3 text-sm text-[#374151]">
                    No project selected.
                </div>
            </div>
        );
    }

    if (!published) {
        return (
            <div className="h-full w-full flex items-center justify-center">
                <div className="rounded-xl border border-[#E6EAF0] bg-white px-4 py-3 text-sm text-[#374151]">
                    Loading digital twin scene…
                </div>
            </div>
        );
    }

    if (models.length === 0) {
        return (
            <div className="h-full w-full flex items-center justify-center">
                <div className="rounded-xl border border-[#E6EAF0] bg-white px-4 py-3 text-sm text-[#374151]">
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

                <Selection>
                    <EffectComposer multisampling={4}>
                        <Outline
                            visibleEdgeColor={0x00ffff}
                            hiddenEdgeColor={0x00ffff}
                            edgeStrength={5}
                            blur
                        />
                    </EffectComposer>
                    <SceneContent
                        models={models}
                        onFocusDistance={setFocusWorldDistance}
                        selectedId={selectedId}
                        onSelect={handleSelect}
                        activeTool={activeTool}
                        onBimElementSelect={onBimElementSelect}
                        measurements={measurements}
                        setMeasurements={setMeasurements}
                        currentPoints={currentPoints}
                        setCurrentPoints={setCurrentPoints}
                        unit={unit}
                        issues={issues ?? []}
                        selectedIssueId={selectedIssueId}
                        onIssuePinClick={onIssuePinClick}
                        onIssuePlaced={setPendingIssuePosition}
                        categoryState={categoryState}
                        dimOthers={dimOthers}
                    />
                </Selection>

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

            {/* Measurement Panel — only visible when measure tool is active */}
            {activeTool === "measure" && (
                <MeasurementPanel
                    unit={unit}
                    setUnit={setUnit}
                    measurements={measurements}
                    onDelete={(id) =>
                        setMeasurements(prev => prev.filter(m => m.id !== id))
                    }
                    onClearAll={() => setMeasurements([])}
                />
            )}

            {/* Filter Panel — only visible when filter tool is active */}
            {activeTool === "filter" && (
                <FilterPanel
                    categories={categories}
                    categoryCounts={categoryCounts}
                    categoryState={categoryState}
                    setCategoryState={setCategoryState}
                    dimOthers={dimOthers}
                    setDimOthers={setDimOthers}
                />
            )}

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


// ─── CaptureController ────────────────────────────────────────────────────────
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


// ─── SceneContent ─────────────────────────────────────────────────────────────
function SceneContent({
    models,
    onFocusDistance,
    selectedId,
    onSelect,
    activeTool,
    onBimElementSelect,
    measurements,
    setMeasurements,
    currentPoints,
    setCurrentPoints,
    unit,
    issues,
    selectedIssueId,
    onIssuePinClick,
    onIssuePlaced,
    categoryState,
    dimOthers,
}) {
    const rootRef = useRef();
    const { camera } = useThree();

    const mockStatus = (id = "") => {
        const n = [...String(id)].reduce((a, c) => a + c.charCodeAt(0), 0) % 3;
        return n === 0 ? "Healthy" : n === 1 ? "Maintenance" : "Offline";
    };

    // Cursor feedback
    useEffect(() => {
        const canvas = document.querySelector("canvas");
        if (canvas) {
            canvas.style.cursor =
                activeTool === "bim" || activeTool === "measure" || activeTool === "issue"
                    ? "crosshair"
                    : "";
        }
        return () => {
            if (canvas) canvas.style.cursor = "";
        };
    }, [activeTool]);

    const handlePick = useCallback(
        (e, model) => {
            e.stopPropagation();

            // Focus distance (for DoF if needed later)
            const hitPoint = e.point?.clone?.() ?? null;
            if (hitPoint) {
                const dist = camera.position.distanceTo(hitPoint);
                onFocusDistance(dist);
            }

            // ── Issue tool ────────────────────────────────────────────────────
            if (activeTool === "issue") {
                const hit = e.point?.clone?.();
                if (!hit) return;
                // Notify parent with the picked position to open modal
                onIssuePlaced?.({ x: hit.x, y: hit.y, z: hit.z });
                return;
            }

            // ── Measurement tool ──────────────────────────────────────────────
            if (activeTool === "measure") {
                const hit = e.point?.clone?.();
                if (!hit) return;

                setCurrentPoints(prev => {
                    if (prev.length === 0) {
                        // First click — store pending point
                        return [hit];
                    }

                    if (prev.length === 1) {
                        // Second click — complete the measurement
                        const newMeasurement = {
                            id: crypto.randomUUID(),
                            pointA: prev[0],
                            pointB: hit,
                            distance: prev[0].distanceTo(hit),
                        };
                        setMeasurements(m => [...m, newMeasurement]);
                        return []; // reset for next measurement
                    }

                    return [hit];
                });

                return;
            }

            // ── BIM mode ──────────────────────────────────────────────────────
            if (activeTool === "bim") {
                const fileName = model.name;
                const baseName = fileName.replace(".glb", "");
                const normalizedName = baseName.trim().toLowerCase();

                onSelect?.({ id: model.id, _bimPick: true });
                onBimElementSelect?.({ name: normalizedName, originalName: baseName });

                return;
            }
        },
        [
            camera,
            onFocusDistance,
            onSelect,
            activeTool,
            onBimElementSelect,
            setMeasurements,
            setCurrentPoints,
            onIssuePlaced,
        ]
    );

    return (
        <group ref={rootRef}>
            {models.map((m) => {
                const category = categorize(m.name);
                const catState = categoryState[category] ?? { visible: true, opacity: 1, highlighted: false };
                const isVisible = catState.visible;
                const highlighted = catState.highlighted;
                // dimOthers overrides opacity for non-highlighted categories.
                const opacity = (dimOthers && !highlighted) ? 0.15 : catState.opacity;

                return (
                    <ModelGroupController
                        key={m.id}
                        isVisible={isVisible}
                        opacity={opacity}
                        highlighted={highlighted}
                        enabled={selectedId === m.id}
                        assetId={m.id}
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
                    </ModelGroupController>
                );
            })}

            {/* Render all completed measurements */}
            {measurements.map(m => (
                <MeasurementLine
                    key={m.id}
                    pointA={m.pointA}
                    pointB={m.pointB}
                    unit={unit}
                />
            ))}

            {/* Pending first-click indicator */}
            {currentPoints.length === 1 && (
                <mesh position={currentPoints[0]}>
                    <sphereGeometry args={[0.05, 16, 16]} />
                    <meshBasicMaterial color="cyan" />
                </mesh>
            )}

            {/* Issue pins */}
            {issues.map((issue) => (
                <IssuePin
                    key={issue._id}
                    issue={issue}
                    selected={issue._id === selectedIssueId}
                    onClick={onIssuePinClick}
                />
            ))}

            <AutoFitCamera targetRef={rootRef} />
        </group>
    );
}


// ─── ModelGroupController ─────────────────────────────────────────────────────
// Applies per-category opacity and highlight (emissive) imperatively via
// useFrame. Two independent refs track the last-applied values so that
// either dimension can change without re-traversing unnecessarily.
// useFrame handles the async GLTF load race: it retries each frame until
// meshes are actually found, then becomes a near-free ref comparison.
function ModelGroupController({ isVisible, opacity, highlighted, enabled, assetId, onPointerDown, children }) {
    const groupRef = useRef();
    const lastOpacity = useRef(null);
    const lastHighlighted = useRef(null);

    useFrame(() => {
        const opUnchanged = lastOpacity.current === opacity;
        const hiUnchanged = lastHighlighted.current === highlighted;
        if (opUnchanged && hiUnchanged) return;

        const g = groupRef.current;
        if (!g) return;

        let found = false;
        g.traverse(child => {
            if (!child.isMesh) return;
            found = true;
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach(mat => {
                // ── Opacity ──────────────────────────────────────────────────
                mat.transparent = opacity < 1;
                mat.opacity = opacity;
                mat.depthWrite = opacity === 1;

                // ── Highlight (emissive) — only materials that support it ───
                if ('emissive' in mat) {
                    mat.emissive.set(highlighted ? 0x00ffff : 0x000000);
                    mat.emissiveIntensity = highlighted ? 0.4 : 0;
                }

                mat.needsUpdate = true;
            });
        });

        // Only commit once meshes were found (GLTF may still be loading).
        if (found) {
            lastOpacity.current = opacity;
            lastHighlighted.current = highlighted;
        }
    });

    return (
        <group ref={groupRef} visible={isVisible}>
            <Select enabled={enabled}>
                <group userData={{ assetId }} onPointerDown={onPointerDown}>
                    {children}
                </group>
            </Select>
        </group>
    );
}


// ─── MeasurementLine ─────────────────────────────────────────────────────────
function MeasurementLine({ pointA, pointB, unit }) {
    const distance = useMemo(() => pointA.distanceTo(pointB), [pointA, pointB]);

    const midPoint = useMemo(() => (
        new THREE.Vector3().addVectors(pointA, pointB).multiplyScalar(0.5)
    ), [pointA, pointB]);

    const geometry = useMemo(() => (
        new THREE.BufferGeometry().setFromPoints([pointA, pointB])
    ), [pointA, pointB]);

    const displayDist = convertDistance(distance, unit).toFixed(2);
    const displayLabel = UNIT_LABELS[unit];

    return (
        <>
            {/* Line */}
            <line geometry={geometry}>
                <lineBasicMaterial color="yellow" linewidth={2} />
            </line>

            {/* Endpoint spheres */}
            <mesh position={pointA}>
                <sphereGeometry args={[0.05, 16, 16]} />
                <meshBasicMaterial color="red" />
            </mesh>
            <mesh position={pointB}>
                <sphereGeometry args={[0.05, 16, 16]} />
                <meshBasicMaterial color="red" />
            </mesh>

            {/* Distance label */}
            <Html position={midPoint} center>
                <div className="bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                    {displayDist} {displayLabel}
                </div>
            </Html>
        </>
    );
}


// ─── AutoFitCamera ────────────────────────────────────────────────────────────
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


// ─── CameraPresetsController ──────────────────────────────────────────────────
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

        if (type === "focus-position" && request.position) {
            const { x, y, z } = request.position;
            const target = new THREE.Vector3(x, y, z);
            const offset = new THREE.Vector3(3, 2, 3);
            const pos = target.clone().add(offset);
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