import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Maximize2, Minimize2, Camera, Eye } from "lucide-react";
import ScenePreviewCanvas from "./components/ScenePreviewCanvas";
import TwinToolbar from "../components/twin/TwinToolbar";
import BimMetadataPanel from "../components/twin/BimMetadataPanel";

const CAMERA_PRESETS = ["overview", "top", "side", "ground"];

/**
 * Digital Twin full-page view.
 * Route: /twin?id=PROJECT_ID
 *
 * Renders ScenePreviewCanvas filling the entire available viewport area
 * (sidebar + header are provided by AppLayout; this component fills the rest).
 * The dashboard preview card in DigitalTwinDashboard is not affected.
 */
export default function TwinPage() {
    const location = useLocation();
    const projectId = new URLSearchParams(location.search).get("id");

    const [cameraRequest, setCameraRequest] = useState({ type: "overview", nonce: 0 });
    const [captureRequest, setCaptureRequest] = useState({ nonce: 0 });
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const [activeTool, setActiveTool] = useState(null);
    // { name: string (normalized), originalName: string } | null
    const [selectedElement, setSelectedElement] = useState(null);

    const containerRef = useRef(null);

    // Sync fullscreen state with browser fullscreen API
    useEffect(() => {
        const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener("fullscreenchange", onFsChange);
        return () => document.removeEventListener("fullscreenchange", onFsChange);
    }, []);

    const requestCamera = (type) =>
        setCameraRequest((prev) => ({ type, nonce: prev.nonce + 1 }));

    const requestCapture = () =>
        setCaptureRequest((prev) => ({ nonce: prev.nonce + 1 }));

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen?.();
        } else {
            document.exitFullscreen?.();
        }
    };

    const handleToolChange = (tool) => {
        setActiveTool(tool);
        if (!tool) setSelectedElement(null);
    };

    const handleBimPanelClose = () => {
        setSelectedElement(null);
        setActiveTool(null);
    };

    if (!projectId) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-gray-950">
                <div className="text-center text-white/60">
                    <Eye className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">No project selected.</p>
                    <p className="text-xs mt-1 opacity-60">Open a project from the Dashboard to view its Digital Twin.</p>
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="relative h-full w-full bg-gray-950 overflow-hidden">

            {/* Full-page 3D canvas — fills all available space */}
            <ScenePreviewCanvas
                projectId={projectId}
                cameraRequest={cameraRequest}
                captureRequest={captureRequest}
                onSelectAsset={setSelectedAsset}
                activeTool={activeTool}
                onBimElementSelect={setSelectedElement}
            />

            {/* ── Overlay: camera preset strip + action buttons ── */}
            <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2">

                {/* Camera preset buttons */}
                <div className="flex gap-1 bg-black/50 backdrop-blur-sm border border-white/10 rounded-xl px-2 py-1.5">
                    {CAMERA_PRESETS.map((preset) => (
                        <button
                            key={preset}
                            onClick={() => requestCamera(preset)}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium text-white/70 hover:text-white hover:bg-white/15 transition-all capitalize"
                            title={`${preset} view`}
                        >
                            {preset}
                        </button>
                    ))}
                </div>

                {/* Capture screenshot + fullscreen toggle */}
                <div className="flex gap-1.5">
                    <button
                        onClick={requestCapture}
                        title="Capture screenshot"
                        className="p-2 rounded-xl bg-black/50 backdrop-blur-sm border border-white/10 text-white/70 hover:text-white hover:bg-white/15 transition-all"
                    >
                        <Camera className="w-4 h-4" />
                    </button>
                    <button
                        onClick={toggleFullscreen}
                        title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                        className="p-2 rounded-xl bg-black/50 backdrop-blur-sm border border-white/10 text-white/70 hover:text-white hover:bg-white/15 transition-all"
                    >
                        {isFullscreen
                            ? <Minimize2 className="w-4 h-4" />
                            : <Maximize2 className="w-4 h-4" />
                        }
                    </button>
                </div>
            </div>

            {/* ── Floating toolbar (bottom-center) ── */}
            <TwinToolbar activeTool={activeTool} onToolChange={handleToolChange} />

            {/* ── BIM metadata panel (slides in from right) ── */}
            <BimMetadataPanel
                projectId={projectId}
                selected={selectedElement}
                onClose={handleBimPanelClose}
            />

            {/* ── Asset info panel (bottom-left when an asset is selected in normal mode) ── */}
            {selectedAsset && activeTool !== 'bim' && (
                <div className="absolute bottom-4 left-4 z-10 bg-black/60 backdrop-blur-sm border border-white/10 rounded-xl p-3 min-w-[200px] max-w-[280px]">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="text-sm font-semibold text-white leading-tight">
                            {selectedAsset.name}
                        </span>
                        <button
                            onClick={() => setSelectedAsset(null)}
                            className="text-white/40 hover:text-white transition-colors text-xs shrink-0 mt-0.5"
                            aria-label="Dismiss"
                        >
                            ✕
                        </button>
                    </div>
                    <div className="text-xs text-white/60 space-y-0.5">
                        <div>{selectedAsset.category} · {selectedAsset.type}</div>
                        <div>
                            Status:{" "}
                            <span className={
                                selectedAsset.status === "Healthy"
                                    ? "text-emerald-400"
                                    : selectedAsset.status === "Offline"
                                        ? "text-red-400"
                                        : "text-amber-400"
                            }>
                                {selectedAsset.status}
                            </span>
                        </div>
                        {selectedAsset.lastUpdated && (
                            <div className="opacity-50">Updated {selectedAsset.lastUpdated}</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
