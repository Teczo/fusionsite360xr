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
function convertDistance(distance, unit) {
    switch (unit) {
        case "cm":        return distance * 100;
        case "meter":     return distance;
        case "kilometer": return distance / 1000;
        case "inch":      return distance * 39.3701;
        case "feet":      return distance * 3.28084;
        default:          return distance;
    }
}

const UNIT_LABELS = {
    cm:        "cm",
    meter:     "m",
    kilometer: "km",
    inch:      "in",
    feet:      "ft",
};

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
    if (s.includes("pump"))                 return "Pump";
    if (s.includes("valve"))                return "Valve";
    if (s.includes("hvac") || s.includes("duct")) return "HVAC";
    if (s.includes("cable") || s.includes("elect")) return "Electrical";
    if (s.includes("pipe"))                 return "Piping";
    return "Structure";
}

// ─── MeasurementPanel ─────────────────────────────────────────────────────────
function MeasurementPanel({ unit, setUnit, measurements, onDelete, onClearAll }) {
    const handleCopy = (m) => {
        const label = UNIT_LABELS[unit];
        const dist  = convertDistance(m.distance, unit).toFixed(2);
        const text  = [
            `Length: ${dist} ${label}`,
            `A: (${m.pointA.x.toFixed(3)}, ${m.pointA.y.toFixed(3)}, ${m.pointA.z.toFixed(3)})`,
            `B: (${m.pointB.x.toFixed(3)}, ${m.pointB.y.toFixed(3)}, ${m.pointB.z.toFixed(3)})`,
        ].join("\n");
        navigator.clipboard?.writeText(text);
    };

    return (
        <div className="absolute right-5 top-5 w-80 bg-[#0F172A]/95 backdrop-blur border border-white/10 rounded-2xl p-4 text-white z-20">
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold">Measure</h2>
                {measurements.length > 0 && (
                    <button onClick={onClearAll} className="text-white/40 hover:text-red-400 text-xs transition-colors">
                        Clear all
                    </button>
                )}
            </div>

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

            {measurements.length === 0 ? (
                <p className="text-white/30 text-xs text-center py-4">Click two points on the model to measure</p>
            ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {measurements.map((m, i) => (
                        <div key={m.id} className={`border rounded-xl p-3 ${CARD_COLORS[i % CARD_COLORS.length]}`}>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-white/50 font-medium uppercase tracking-wide">#{i + 1} Length</span>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleCopy(m)} className="text-white/30 hover:text-white/70 text-xs transition-colors">Copy</button>
                                    <button onClick={() => onDelete(m.id)} className="text-white/30 hover:text-red-400 text-xs transition-colors">Delete</button>
                                </div>
                            </div>
                            <div className="text-lg font-semibold mb-2">
                                {convertDistance(m.distance, unit).toFixed(2)}{" "}
                                <span className="text-sm font-normal text-white/60">{UNIT_LABELS[unit]}</span>
                            </div>
                            <div className="space-y-1 text-xs text-white/40 font-mono">
                                <div>A ({m.pointA.x.toFixed(2)}, {m.pointA.y.toFixed(2)}, {m.pointA.z.toFixed(2)})</div>
                                <div>B ({m.pointB.x.toFixed(2)}, {m.pointB.y.toFixed(2)}, {m.pointB.z.toFixed(2)})</div>
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
    issues,
    selectedIssueId,
    onIssuePinClick,
    setPendingIssuePosition,
}) {
    const [published, setPublished] = useState(null);
    const [error, setError] = useState("");
    const [selectedId, setSelectedId] = useState(null);

    const [measurements, setMeasurements] = useState([]);
    const [currentPoints, setCurrentPoints] = useState([]);
    const [unit, setUnit] = useState("cm");

    const [selectedBox, setSelectedBox] = useState(null);
    const [sceneBox, setSceneBox] = useState(null);
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

    // Unified per-category visual state
    const [categoryState, setCategoryState] = useState({});
    const [dimOthers, setDimOthers] = useState(false);

    // 1. Derivation of Models
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

    // 2. Derivation of Categories
    const categories = useMemo(() => {
        const set = new Set();
        models.forEach(m => set.add(categorize(m.name)));
        return Array.from(set).sort();
    }, [models]);

    // 3. Category Counts
    const categoryCounts = useMemo(() => {
        const counts = {};
        models.forEach(m => {
            const cat = categorize(m.name);
            counts[cat] = (counts[cat] || 0) + 1;
        });
        return counts;
    }, [models]);

    // 4. Initialise Category State (Depends on categories defined above)
    useEffect(() => {
        setCategoryState(prev => {
            const next = {};
            categories.forEach(cat => {
                next[cat] = prev[cat] ?? { visible: true, opacity: 1, highlighted: false };
            });
            return next;
        });
    }, [categories]);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            if (!projectId || !api) return;
            try {
                setError("");
                const res = await fetch(`${api}/api/published/${projectId}`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = await res.json();
                if (!cancelled) setPublished(json);
            } catch (e) {
                if (!cancelled) setError(e.message || String(e));
            }
        }
        load();
        return () => { cancelled = true; };
    }, [api, projectId]);

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

    useEffect(() => {
        if (activeTool !== "measure") setCurrentPoints([]);
    }, [activeTool]);

    useEffect(() => {
        if (activeTool !== "bim") setSelectedId(null);
    }, [activeTool]);

    const handleSelect = useCallback((payload) => {
        setSelectedId(payload.id);
        if (!payload._bimPick) onSelectAsset?.(payload);
    }, [onSelectAsset]);

    if (error) return <div className="h-full w-full flex items-center justify-center"><div className="rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">{error}</div></div>;
    if (!projectId) return <div className="h-full w-full flex items-center justify-center"><div className="rounded-xl border border-[#E6EAF0] bg-white px-4 py-3 text-sm text-[#374151]">No project selected.</div></div>;
    if (!published) return <div className="h-full w-full flex items-center justify-center"><div className="rounded-xl border border-[#E6EAF0] bg-white px-4 py-3 text-sm text-[#374151]">Loading digital twin scene…</div></div>;

    return (
        <div className="relative h-full w-full">
            <Canvas gl={{ preserveDrawingBuffer: true }} camera={{ position: [0, 2, 8], fov: 45 }} className="h-full w-full">
                <CaptureController captureRequest={captureRequest} />
                <ambientLight intensity={0.9} />
                <directionalLight position={[10, 12, 6]} intensity={1.2} />
                <directionalLight position={[-6, 6, -4]} intensity={0.6} />

                <Selection>
                    <EffectComposer multisampling={4}>
                        <Outline visibleEdgeColor={0x00ffff} hiddenEdgeColor={0x00ffff} edgeStrength={5} blur />
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
                />

                <OrbitControls makeDefault enableDamping dampingFactor={0.08} />
            </Canvas>

            {activeTool === "measure" && (
                <MeasurementPanel
                    unit={unit} setUnit={setUnit}
                    measurements={measurements}
                    onDelete={(id) => setMeasurements(prev => prev.filter(m => m.id !== id))}
                    onClearAll={() => setMeasurements([])}
                />
            )}

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
                <DoFDevPanel enabled={dofEnabled} settings={dofSettings} setEnabled={setDofEnabled} setSettings={setDofSettings} />
            )}
        </div>
    );
}

// ─── Controller Components ───────────────────────────────────────────────────

function CaptureController({ captureRequest }) {
    const { gl } = useThree();
    useEffect(() => {
        if (!captureRequest?.nonce) return;
        const dataUrl = gl.domElement.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `DigitalTwin_${new Date().getTime()}.png`;
        a.click();
    }, [captureRequest?.nonce, gl]);
    return null;
}

function SceneContent({
    models, onFocusDistance, selectedId, onSelect, activeTool, onBimElementSelect,
    measurements, setMeasurements, currentPoints, setCurrentPoints, unit,
    issues, selectedIssueId, onIssuePinClick, onIssuePlaced, categoryState, dimOthers
}) {
    const { camera } = useThree();
    const rootRef = useRef();

    useEffect(() => {
        const canvas = document.querySelector("canvas");
        if (canvas) canvas.style.cursor = ["bim", "measure", "issue"].includes(activeTool) ? "crosshair" : "";
    }, [activeTool]);

    const handlePick = useCallback((e, model) => {
        e.stopPropagation();
        const hit = e.point?.clone();
        if (!hit) return;

        onFocusDistance(camera.position.distanceTo(hit));

        if (activeTool === "issue") {
            onIssuePlaced?.({ x: hit.x, y: hit.y, z: hit.z });
        } else if (activeTool === "measure") {
            setCurrentPoints(prev => {
                if (prev.length === 0) return [hit];
                const newM = { id: crypto.randomUUID(), pointA: prev[0], pointB: hit, distance: prev[0].distanceTo(hit) };
                setMeasurements(m => [...m, newM]);
                return [];
            });
        } else if (activeTool === "bim") {
            const baseName = model.name.replace(".glb", "");
            onSelect?.({ id: model.id, _bimPick: true });
            onBimElementSelect?.({ name: baseName.trim().toLowerCase(), originalName: baseName });
        }
    }, [camera, activeTool, onFocusDistance, onIssuePlaced, setCurrentPoints, setMeasurements, onSelect, onBimElementSelect]);

    return (
        <group ref={rootRef}>
            {models.map((m) => {
                const category = categorize(m.name);
                const catState = categoryState[category] ?? { visible: true, opacity: 1, highlighted: false };
                const opacity = (dimOthers && !catState.highlighted) ? 0.15 : catState.opacity;

                return (
                    <ModelGroupController
                        key={m.id}
                        isVisible={catState.visible}
                        opacity={opacity}
                        highlighted={catState.highlighted}
                        enabled={selectedId === m.id}
                        assetId={m.id}
                        onPointerDown={(e) => handlePick(e, m)}
                    >
                        <ModelItem id={m.id} url={m.url} transform={m.transform} />
                    </ModelGroupController>
                );
            })}
            {measurements.map(m => <MeasurementLine key={m.id} pointA={m.pointA} pointB={m.pointB} unit={unit} />)}
            {currentPoints.map((p, i) => (
                <mesh key={i} position={p}><sphereGeometry args={[0.05, 16, 16]} /><meshBasicMaterial color="cyan" /></mesh>
            ))}
            {issues.map((issue) => (
                <IssuePin key={issue._id} issue={issue} selected={issue._id === selectedIssueId} onClick={onIssuePinClick} />
            ))}
            <AutoFitCamera targetRef={rootRef} />
        </group>
    );
}

function ModelGroupController({ isVisible, opacity, highlighted, enabled, assetId, onPointerDown, children }) {
    const groupRef = useRef();
    const lastOp = useRef(null);
    const lastHi = useRef(null);

    useFrame(() => {
        if (lastOp.current === opacity && lastHi.current === highlighted) return;
        const g = groupRef.current;
        if (!g) return;

        let found = false;
        g.traverse(child => {
            if (!child.isMesh) return;
            found = true;
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach(mat => {
                mat.transparent = opacity < 1;
                mat.opacity = opacity;
                if ('emissive' in mat) {
                    mat.emissive.set(highlighted ? 0x00ffff : 0x000000);
                    mat.emissiveIntensity = highlighted ? 0.4 : 0;
                }
            });
        });
        if (found) { lastOp.current = opacity; lastHi.current = highlighted; }
    });

    return (
        <group ref={groupRef} visible={isVisible}>
            <Select enabled={enabled}>
                <group userData={{ assetId }} onPointerDown={onPointerDown}>{children}</group>
            </Select>
        </group>
    );
}

function MeasurementLine({ pointA, pointB, unit }) {
    const distance = useMemo(() => pointA.distanceTo(pointB), [pointA, pointB]);
    const midPoint = useMemo(() => new THREE.Vector3().addVectors(pointA, pointB).multiplyScalar(0.5), [pointA, pointB]);
    const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints([pointA, pointB]), [pointA, pointB]);

    return (
        <>
            <line geometry={geometry}><lineBasicMaterial color="yellow" /></line>
            <mesh position={pointA}><sphereGeometry args={[0.05, 16, 16]} /><meshBasicMaterial color="red" /></mesh>
            <mesh position={pointB}><sphereGeometry args={[0.05, 16, 16]} /><meshBasicMaterial color="red" /></mesh>
            <Html position={midPoint} center>
                <div className="bg-black/80 text-white text-xs px-2 py-1 rounded">
                    {convertDistance(distance, unit).toFixed(2)} {UNIT_LABELS[unit]}
                </div>
            </Html>
        </>
    );
}

function AutoFitCamera({ targetRef }) {
    const { camera, controls } = useThree();
    useEffect(() => {
        const fit = () => {
            const root = targetRef.current;
            if (!root) return;
            const box = new THREE.Box3().setFromObject(root);
            if (box.isEmpty()) { requestAnimationFrame(fit); return; }
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const dist = maxDim / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) * 1.4;
            camera.position.set(center.x + dist, center.y + dist * 0.4, center.z + dist);
            if (controls) { controls.target.copy(center); controls.update(); }
        };
        fit();
    }, [camera, controls, targetRef]);
    return null;
}

function CameraPresetsController({ request, sceneBox, selectedBox }) {
    const { camera, controls } = useThree();
    const tweenRef = useRef(null);

    useEffect(() => {
        if (!request?.type || !controls) return;
        const box = (request.type === "focus" && selectedBox) ? selectedBox : (sceneBox || new THREE.Box3(new THREE.Vector3(-2,-2,-2), new THREE.Vector3(2,2,2)));
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const dist = Math.max(size.x, size.y, size.z) * 1.5;

        let newPos = new THREE.Vector3().copy(center).add(new THREE.Vector3(dist, dist, dist));
        if (request.type === "top") newPos.set(center.x, center.y + dist, center.z + 0.01);
        
        tweenRef.current = { t0: performance.now(), duration: 600, fromPos: camera.position.clone(), toPos: newPos, fromTarget: controls.target.clone(), toTarget: center };
    }, [request?.nonce, sceneBox, selectedBox, camera, controls]);

    useFrame(() => {
        if (!tweenRef.current || !controls) return;
        const { t0, duration, fromPos, toPos, fromTarget, toTarget } = tweenRef.current;
        const t = Math.min(1, (performance.now() - t0) / duration);
        const ease = t * t * (3 - 2 * t);
        camera.position.lerpVectors(fromPos, toPos, ease);
        controls.target.lerpVectors(fromTarget, toTarget, ease);
        controls.update();
        if (t >= 1) tweenRef.current = null;
    });
    return null;
}
