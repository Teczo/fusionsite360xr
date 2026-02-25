import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { Maximize2, Minimize2, Camera, Eye } from "lucide-react";
import ScenePreviewCanvas from "./components/ScenePreviewCanvas";
import TwinToolbar from "../components/twin/TwinToolbar";
import BimMetadataPanel from "../components/twin/BimMetadataPanel";
import IssueModal from "../components/twin/IssueModal";
import IssuePanel from "../components/ProjectModules/IssuePanel";
import { issuesApi, userApi } from "../services/api.js";

const CAMERA_PRESETS = ["overview", "top", "side", "ground"];

const WS_URL = import.meta.env.VITE_WS_URL
    ?? import.meta.env.VITE_API_URL?.replace(/^http/, "ws")
    ?? "ws://localhost:4000";

/**
 * Digital Twin full-page view.
 * Route: /twin?id=PROJECT_ID
 */
export default function TwinPage() {
    const location = useLocation();
    const projectId = new URLSearchParams(location.search).get("id");

    const [cameraRequest, setCameraRequest]   = useState({ type: "overview", nonce: 0 });
    const [captureRequest, setCaptureRequest] = useState({ nonce: 0 });
    const [selectedAsset, setSelectedAsset]   = useState(null);
    const [isFullscreen, setIsFullscreen]     = useState(false);

    const [activeTool, setActiveTool]         = useState(null);
    const [selectedElement, setSelectedElement] = useState(null);

    // ── Current user (for panel permission checks) ─────────────────────────────
    const [currentUser, setCurrentUser] = useState(null);

    // ── Issue state ────────────────────────────────────────────────────────────
    const [issues, setIssues]                           = useState([]);
    const [selectedIssueId, setSelectedIssueId]         = useState(null);
    const [pendingIssuePosition, setPendingIssuePosition] = useState(null);

    const wsRef        = useRef(null);
    const containerRef = useRef(null);

    // Sync fullscreen state with browser fullscreen API
    useEffect(() => {
        const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener("fullscreenchange", onFsChange);
        return () => document.removeEventListener("fullscreenchange", onFsChange);
    }, []);

    // ── Fetch current user once ────────────────────────────────────────────────
    useEffect(() => {
        userApi.me()
            .then(setCurrentUser)
            .catch(() => {/* degrade gracefully — panel hides delete for unknown users */});
    }, []);

    // ── Load issues on mount ───────────────────────────────────────────────────
    useEffect(() => {
        if (!projectId) return;
        issuesApi.list(projectId)
            .then(setIssues)
            .catch((err) => console.error("Failed to load issues:", err));
    }, [projectId]);

    // ── WebSocket client ───────────────────────────────────────────────────────
    useEffect(() => {
        if (!projectId) return;

        let ws;
        let reconnectTimer;

        const connect = () => {
            ws = new WebSocket(`${WS_URL}/ws`);
            wsRef.current = ws;

            ws.onopen = () => {
                ws.send(JSON.stringify({ type: "join", projectId }));
            };

            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.type === "issue_created") {
                        setIssues((prev) => {
                            if (prev.some((i) => i._id === msg.issue._id)) return prev;
                            return [msg.issue, ...prev];
                        });
                    } else if (msg.type === "issue_updated") {
                        setIssues((prev) =>
                            prev.map((i) => (i._id === msg.issue._id ? msg.issue : i))
                        );
                    } else if (msg.type === "issue_deleted") {
                        setIssues((prev) => prev.filter((i) => i._id !== msg.issueId));
                        setSelectedIssueId((prev) => (prev === msg.issueId ? null : prev));
                    }
                } catch {
                    // Ignore malformed messages
                }
            };

            ws.onclose = () => {
                reconnectTimer = setTimeout(connect, 3000);
            };

            ws.onerror = () => ws.close();
        };

        connect();

        return () => {
            clearTimeout(reconnectTimer);
            wsRef.current?.close();
        };
    }, [projectId]);

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
        // Clear cross-tool state when switching
        if (tool !== "bim")   setSelectedElement(null);
        if (tool !== "issue") {
            setPendingIssuePosition(null);
            setSelectedIssueId(null);
        }
    };

    const handleBimPanelClose = () => {
        setSelectedElement(null);
        setActiveTool(null);
    };

    // Central focus helper shared by pin clicks and panel cell clicks
    const focusIssue = useCallback((issue) => {
        setSelectedIssueId(issue._id);
        setCameraRequest((prev) => ({
            type: "focus-position",
            position: issue.position,
            nonce: prev.nonce + 1,
        }));
    }, []);

    // 3D pin clicked
    const handleIssuePinClick = useCallback((issue) => {
        focusIssue(issue);
    }, [focusIssue]);

    // Panel cell clicked
    const handleIssueCellFocus = useCallback((issue) => {
        focusIssue(issue);
    }, [focusIssue]);

    // Issue created via modal
    const handleIssueCreated = useCallback((issue) => {
        setIssues((prev) => {
            if (prev.some((i) => i._id === issue._id)) return prev;
            return [issue, ...prev];
        });
        setPendingIssuePosition(null);
        setSelectedIssueId(issue._id);
    }, []);

    // Status updated from panel dropdown
    const handleStatusChange = useCallback(async (issueId, status) => {
        // Optimistic update for instant feedback
        setIssues((prev) =>
            prev.map((i) => (i._id === issueId ? { ...i, status } : i))
        );
        try {
            await issuesApi.update(issueId, { status });
            // WS broadcast from server will re-sync for other clients
        } catch (err) {
            console.error("Status update failed:", err.message);
            // Revert — reload full list
            issuesApi.list(projectId).then(setIssues).catch(() => {});
        }
    }, [projectId]);

    // Delete from panel
    const handleDeleteIssue = useCallback(async (issueId) => {
        // Optimistic removal
        setIssues((prev) => prev.filter((i) => i._id !== issueId));
        setSelectedIssueId((prev) => (prev === issueId ? null : prev));
        try {
            await issuesApi.remove(issueId);
        } catch (err) {
            console.error("Delete issue failed:", err.message);
            // Revert — reload full list
            issuesApi.list(projectId).then(setIssues).catch(() => {});
        }
    }, [projectId]);

    const handleIssuePanelClose = () => {
        setActiveTool(null);
        setSelectedIssueId(null);
        setPendingIssuePosition(null);
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

    const issuePanelOpen = activeTool === "issue";

    return (
        <div ref={containerRef} className="relative h-full w-full bg-gray-950 overflow-hidden">

            {/* Full-page 3D canvas */}
            <ScenePreviewCanvas
                projectId={projectId}
                cameraRequest={cameraRequest}
                captureRequest={captureRequest}
                onSelectAsset={setSelectedAsset}
                activeTool={activeTool}
                onBimElementSelect={setSelectedElement}
                issues={issues}
                selectedIssueId={selectedIssueId}
                onIssuePinClick={handleIssuePinClick}
                pendingIssuePosition={pendingIssuePosition}
                setPendingIssuePosition={setPendingIssuePosition}
            />

            {/* ── Overlay: camera presets + action buttons ── */}
            {/* Shift left when issue panel is open to avoid overlap */}
            <div
                className="absolute top-4 z-10 flex flex-col items-end gap-2 transition-all duration-300"
                style={{ right: issuePanelOpen ? "336px" : "16px" }}
            >
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
                        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* ── Floating toolbar (bottom-center) ── */}
            <TwinToolbar activeTool={activeTool} onToolChange={handleToolChange} />

            {/* ── BIM metadata panel ── */}
            <BimMetadataPanel
                projectId={projectId}
                selected={selectedElement}
                onClose={handleBimPanelClose}
            />

            {/* ── Issue Panel ── */}
            <IssuePanel
                isOpen={issuePanelOpen}
                issues={issues}
                selectedIssueId={selectedIssueId}
                currentUser={currentUser}
                onFocusIssue={handleIssueCellFocus}
                onStatusChange={handleStatusChange}
                onDeleteIssue={handleDeleteIssue}
                onClose={handleIssuePanelClose}
            />

            {/* ── Issue Modal (opens after 3D click when issue tool active) ── */}
            {pendingIssuePosition && (
                <IssueModal
                    projectId={projectId}
                    position={pendingIssuePosition}
                    onClose={() => setPendingIssuePosition(null)}
                    onCreated={handleIssueCreated}
                />
            )}

            {/* ── Asset info panel (bottom-left, normal mode only) ── */}
            {selectedAsset && activeTool !== "bim" && activeTool !== "issue" && (
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
