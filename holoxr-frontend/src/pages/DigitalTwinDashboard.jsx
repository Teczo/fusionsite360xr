import React, { useRef, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { TrendingUp, Zap, Users, Clock, ArrowUpRight, ArrowDownRight } from "lucide-react";

import ScenePreviewCanvas from "./components/ScenePreviewCanvas";
import TimelineList from "../components/ProjectModules/Timeline/TimelineList";
import HSEList from "../components/ProjectModules/HSE/HSEList";
import AlertsList from "../components/ProjectModules/Alerts/AlertsList";
import SCurvePanel from "../components/ProjectModules/SCurve/SCurvePanel";
import MediaGallery from "../components/ProjectModules/Media/MediaGallery";
import ProjectDocuments from "../components/ProjectModules/Documents/ProjectDocuments";

import MapCard from "../components/dashboard/cards/MapCard";
import WeatherCard from "../components/dashboard/cards/WeatherCard";
import LocationSetupCard from "../components/dashboard/cards/LocationSetupCard";

import { bimApi } from "../services/api";
import { toast } from "react-hot-toast";

/**
 * Digital Twin Dashboard (Mock UI + Mock Data)
 * Layout (Sidebar + Header) is provided by AppLayout via routing.
 * This component renders page content only.
 */
export default function DigitalTwinDashboard() {
    const [isTwinFullscreen, setIsTwinFullscreen] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [project, setProject] = useState(null);

    const fileInputRef = useRef(null);
    const [isUploadingBim, setIsUploadingBim] = useState(false);
    const handleBimFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !projectId) return;

        try {
            setIsUploadingBim(true);

            const result = await bimApi.upload(projectId, file);

            toast.success(
                `BIM import successful (${result?.upserted || result?.inserted || 0} components)`
            );
        } catch (err) {
            console.error("BIM upload failed:", err);
            toast.error("BIM upload failed");
        } finally {
            setIsUploadingBim(false);
            e.target.value = ""; // reset input
        }
    };

    const [cameraRequest, setCameraRequest] = useState({ type: "overview", nonce: 0 });
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const projectId = params.get("id");
    const [captureRequest, setCaptureRequest] = useState({ nonce: 0 });

    const requestCapture = () => {
        setCaptureRequest((prev) => ({ nonce: prev.nonce + 1 }));
    };

    const requestCamera = (type) => {
        setCameraRequest((prev) => ({ type, nonce: prev.nonce + 1 }));
    };

    // Fetch project data (for location-based cards)
    useEffect(() => {
        if (!projectId) return;
        const token = localStorage.getItem('token');
        if (!token) return;

        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(
                    `${import.meta.env.VITE_API_URL}/api/projects/${projectId}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                if (res.ok && !cancelled) {
                    const data = await res.json();
                    setProject(data);
                }
            } catch {
                // Silently ignore — location cards just won't render
            }
        })();
        return () => { cancelled = true; };
    }, [projectId]);

    const hasLocation = project?.location?.latitude && project?.location?.longitude;

    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key === "Escape") setIsTwinFullscreen(false);
        };
        if (isTwinFullscreen) window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [isTwinFullscreen]);

    return (
        <div className="w-full">
            {/* Page title — matches ES "Document Management" heading style */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-textpri mb-1" style={{ fontFamily: "'Syne', 'Inter', sans-serif" }}>
                    Project Dashboard
                </h1>
                <p className="text-sm text-textsec">Monitor your digital twin operations and analytics</p>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                <KpiCard
                    icon={<IconChart />}
                    iconBg="bg-[#2C97D4]/10"
                    title="Production Output"
                    value="47,032"
                    sub="Units today"
                    delta="+5.8%"
                    deltaTone="up"
                    foot="vs last period"
                />
                <KpiCard
                    icon={<IconBolt />}
                    iconBg="bg-emerald-400/10"
                    title="Overall OEE"
                    value="92.3%"
                    sub="Target: 90%"
                    delta="+2.1%"
                    deltaTone="up"
                    foot="vs last period"
                />
                <KpiCard
                    icon={<IconUsers />}
                    iconBg="bg-[#76C267]/10"
                    title="Active Workforce"
                    value="3,247"
                    sub="Across all facilities"
                    delta="+1.2%"
                    deltaTone="up"
                    foot="vs last period"
                />
                <KpiCard
                    icon={<IconClock />}
                    iconBg="bg-error/10"
                    title="Downtime Hours"
                    value="12.4"
                    sub="vs. last week"
                    delta="-18%"
                    deltaTone="down"
                    foot="vs last period"
                />
            </div>


            {/* 3D Digital Twin + S-Curve (Side-by-side on desktop) */}
            <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
                {/* S-Curve Panel */}
                <Card>
                    <SCurvePanel projectId={projectId} />
                </Card>
                {/* 3D Digital Twin Panel */}
                <div className="rounded-lg border border-border bg-surface shadow-card">
                    <div className="flex items-center gap-3 p-4 flex-wrap">
                        {projectId && (
                            <button
                                onClick={() => {
                                    const deepLink = `fusionxr://open?projectId=${projectId}`;
                                    window.location.href = deepLink;
                                }}
                                className="rounded-lg btn-gradient-primary px-4 py-2 text-xs font-semibold text-white
                   hover:bg-accent transition focus:outline-none focus:ring-2 focus:ring-accent/30"
                                title="Open in AR (iOS App)"
                            >
                                View in AR
                            </button>
                        )}


                        <CameraPresetBar onPreset={requestCamera} />

                        <button
                            onClick={requestCapture}
                            className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-textpri hover:bg-appbg transition focus:outline-none focus:ring-2 focus:ring-accent/20"
                            title="Capture View"
                        >
                            Capture View
                        </button>

                        <button
                            onClick={() => setIsTwinFullscreen(true)}
                            className="inline-flex items-center justify-center rounded-lg border border-border bg-surface p-2 hover:bg-appbg transition"
                            aria-label="Expand"
                            title="Expand"
                        >
                            <IconExpand />
                        </button>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={!projectId || isUploadingBim}
                            className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-textpri hover:bg-appbg transition disabled:opacity-50"
                            title="Upload BIM CSV"
                        >
                            {isUploadingBim ? "Uploading..." : "Upload BIM"}
                        </button>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={handleBimFileChange}
                    />

                    <div className="relative h-[420px] overflow-hidden rounded-b-xl bg-gradient-to-b from-appbg to-appbg min-w-0 min-h-0">
                        <ScenePreviewCanvas
                            projectId={projectId}
                            cameraRequest={cameraRequest}
                            captureRequest={captureRequest}
                            onSelectAsset={setSelectedAsset}
                        />

                        <div className="absolute top-4 right-4 z-20">
                            <AssetInfoPanel asset={selectedAsset} onClear={() => setSelectedAsset(null)} />
                        </div>

                        {/* subtle vignette */}
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.0)_0%,rgba(0,0,0,0.05)_100%)]" />
                    </div>
                </div>


            </div>

            {/* Map + Weather / Location Setup */}
            {projectId && (
                <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {hasLocation ? (
                        <>
                            <MapCard project={project} />
                            <WeatherCard project={project} />
                        </>
                    ) : (
                        <LocationSetupCard />
                    )}
                </div>
            )}

            {/* Timeline – Full Width Horizontal Panel */}
            {projectId && (
                <div className="mt-5">
                    <Card>
                        <TimelineList projectId={projectId} />
                    </Card>
                </div>
            )}

            {/* HSE + Alerts row */}
            {projectId && (
                <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
                    <Card>
                        <HSEList projectId={projectId} />
                    </Card>
                    <Card>
                        <AlertsList projectId={projectId} />
                    </Card>
                </div>
            )}

            {/* Media Gallery */}
            {projectId && (
                <div className="mt-5">
                    <Card>
                        <MediaGallery projectId={projectId} />
                    </Card>
                </div>
            )}

            {/* Project Documents */}
            {projectId && (
                <div className="mt-5">
                    <Card>
                        <ProjectDocuments projectId={projectId} />
                    </Card>
                </div>
            )}


            {/* Bottom cards (shown when no specific project is loaded) */}
            {!projectId && (
                <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-4">
                    <Card title="Facility Performance Comparison" menu>
                        <MockBars />
                    </Card>
                    <Card title="Resource Utilization (24h)" menu>
                        <Utilization />
                    </Card>
                    <Card title="Alerts & Incidents" menu>
                        <Alerts />
                    </Card>
                    <Card title="CCTV Camera Thumbnail" menu>
                        <CctvMock />
                    </Card>
                </div>
            )}

            {isTwinFullscreen && (
                <div
                    className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) setIsTwinFullscreen(false);
                    }}
                >
                    {/* Dialog */}
                    <div
                        className="absolute inset-4 md:inset-8 rounded-2xl border border-border bg-surface
                 shadow-[0_20px_60px_rgba(0,0,0,0.25)] overflow-hidden"
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                            <div className="flex items-center gap-3 flex-wrap">

                                <div className="inline-flex items-center gap-2">
                                    <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-appbg px-3 py-2">
                                        <span className="text-sm font-semibold text-textpri">3D Digital Twin</span>
                                        <span className="text-xs text-textsec">Fullscreen</span>
                                    </div>
                                </div>

                                <CameraPresetBar onPreset={requestCamera} />

                                <button
                                    onClick={requestCapture}
                                    className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-textpri
             hover:bg-appbg transition focus:outline-none focus:ring-2 focus:ring-accent/20"
                                    title="Capture View"
                                >
                                    Capture View
                                </button>

                                <button
                                    onClick={() => setIsTwinFullscreen(false)}
                                    className="inline-flex items-center justify-center rounded-xl border border-border bg-surface px-3 py-2 text-sm
                     hover:bg-appbg transition"
                                    aria-label="Exit fullscreen"
                                    title="Exit fullscreen (Esc)"
                                >
                                    Exit Fullscreen
                                </button>


                            </div>
                        </div>

                        {/* Content */}
                        <div className="relative h-[calc(100%-64px)] bg-gradient-to-b from-appbg to-appbg min-w-0 min-h-0">
                            <ScenePreviewCanvas
                                projectId={projectId}
                                cameraRequest={cameraRequest}
                                captureRequest={captureRequest}
                                onSelectAsset={setSelectedAsset}
                            />
                            <div className="absolute top-4 right-4 z-20">
                                <AssetInfoPanel asset={selectedAsset} onClear={() => setSelectedAsset(null)} />
                            </div>

                            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.0)_0%,rgba(0,0,0,0.05)_100%)]" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function AssetInfoPanel({ asset, onClear, className = "" }) {
    if (!asset) return null;

    const badge =
        asset.status === "Healthy"
            ? "bg-emerald-400/10 text-emerald-500 border-emerald-400/20"
            : asset.status === "Maintenance"
                ? "bg-amber-400/10 text-amber-500 border-amber-400/20"
                : "bg-error/10 text-error border-error/20";

    return (
        <div
            className={
                "w-[320px] max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-surface shadow-sm overflow-hidden " +
                className
            }
        >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="text-sm font-semibold text-textpri">Asset Info</div>
                <button
                    onClick={onClear}
                    className="text-xs font-semibold text-textsec hover:text-textpri"
                >
                    Clear
                </button>
            </div>

            <div className="px-4 py-3 space-y-3">
                <div>
                    <div className="text-xs text-textsec">Asset Name</div>
                    <div className="text-sm font-semibold text-textpri">{asset.name || "—"}</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <div className="text-xs text-textsec">Type</div>
                        <div className="text-sm font-semibold text-textpri">{asset.type || "—"}</div>
                    </div>
                    <div>
                        <div className="text-xs text-textsec">Category</div>
                        <div className="text-sm font-semibold text-textpri">{asset.category || "—"}</div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 items-end">
                    <div>
                        <div className="text-xs text-textsec">Status</div>
                        <div className={"inline-flex items-center rounded-xl border px-2 py-1 text-xs font-semibold " + badge}>
                            {asset.status || "—"}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs text-textsec">Last Updated</div>
                        <div className="text-sm font-semibold text-textpri">
                            {asset.lastUpdated || "—"}
                        </div>
                    </div>
                </div>

                {asset.hint && (
                    <div className="text-xs text-textsec">
                        {asset.hint}
                    </div>
                )}
            </div>
        </div>
    );
}


function CameraPresetBar({ onPreset }) {
    const Btn = ({ label, type }) => (
        <button
            onClick={() => onPreset(type)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-textpri hover:bg-appbg transition focus:outline-none focus:ring-2 focus:ring-accent/20"
            title={label}
        >
            {label}
        </button>
    );

    return (
        <div className="flex flex-wrap items-center gap-2">
            <Btn label="Overview" type="overview" />
            <Btn label="Top" type="top" />
            <Btn label="Side" type="side" />
            <Btn label="Ground" type="ground" />
            <Btn label="Asset Focus" type="focus" />
        </div>
    );
}

/* ------------------------- KPI ------------------------- */

function KpiCard({ icon, iconBg, title, value, sub, delta, deltaTone, foot }) {
    const deltaUp = deltaTone === "up";

    return (
        <div className="bg-surface p-5 rounded-lg border border-border hover:shadow-card-hover transition-all group">
            {/* Top row: icon left, badge right */}
            <div className="flex items-start justify-between mb-3">
                <div className={`${iconBg || "bg-appbg"} p-2.5 rounded-lg`}>
                    {icon}
                </div>
                <span className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${deltaUp ? 'bg-emerald-400/10 text-emerald-500' : 'bg-error/10 text-error'}`}>
                    {deltaUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {delta}
                </span>
            </div>
            {/* Number + label */}
            <h3 className="text-2xl font-bold text-textpri mb-1" style={{ fontFamily: "'Syne', 'Inter', sans-serif" }}>{value}</h3>
            <p className="text-sm text-textsec">{title}</p>
        </div>
    );
}

/* ------------------------- Shared Card ------------------------- */

function Card({ title, menu, children }) {
    return (
        <div className="rounded-lg border border-border bg-surface p-5 shadow-card">
            <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-textpri" style={{ fontFamily: "'Syne', 'Inter', sans-serif" }}>{title}</div>
                {menu && <button className="text-texttert hover:text-textsec">•••</button>}
            </div>
            <div className="mt-3">{children}</div>
        </div>
    );
}

/* ------------------------- Mock Widgets ------------------------- */

function MockBars() {
    const data = [
        { label: "Malaysia", a: 78, b: 35 },
        { label: "Thailand", a: 88, b: 55 },
        { label: "China", a: 62, b: 72 },
        { label: "India", a: 44, b: 86 },
        { label: "Germany", a: 90, b: 60 },
        { label: "USA", a: 70, b: 40 },
    ];

    return (
        <div>
            <div className="h-[150px] flex items-end gap-3">
                {data.map((d) => (
                    <div key={d.label} className="flex-1 flex items-end gap-1 justify-center">
                        <div
                            className="w-3 rounded-t-md bg-accent"
                            style={{ height: `${d.a}px` }}
                            title="Line A"
                        />
                        <div
                            className="w-3 rounded-t-md bg-brandend"
                            style={{ height: `${d.b}px` }}
                            title="Line B"
                        />
                    </div>
                ))}
            </div>

            <div className="mt-3 grid grid-cols-6 gap-2 text-[11px] text-textsec">
                {data.map((d) => (
                    <div key={d.label} className="text-center">
                        <div>{d.label}</div>
                        <div className="text-texttert">P1</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function Utilization() {
    return (
        <div className="space-y-4">
            <UtilRow label="Power" value="2.0" pct={72} tone="green" />
            <UtilRow label="Water" value="9" pct={88} tone="blue" />
        </div>
    );
}

function UtilRow({ label, value, pct, tone }) {
    const bar =
        tone === "green"
            ? "bg-brandend"
            : "bg-accent";

    return (
        <div>
            <div className="flex items-center justify-between text-xs text-textsec">
                <span>{label}</span>
                <span className="inline-flex items-center gap-2">
                    <span className="rounded-md border border-border bg-surface px-2 py-[2px] text-[11px] font-semibold text-textpri">
                        {value}
                    </span>
                </span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-appbg overflow-hidden">
                <div className={`h-full ${bar}`} style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-texttert">
                <span>0</span>
                <span>300</span>
                <span>600</span>
                <span>900</span>
                <span>1200</span>
                <span>1500</span>
                <span>1800</span>
            </div>
        </div>
    );
}

function Alerts() {
    const items = [
        { level: "Critical", tone: "red", text: "Pump Failure, Line 2" },
        { level: "Warning", tone: "amber", text: "High Pressure, Reactor A" },
        { level: "Critical", tone: "red", text: "High Pressure, Reactor B" },
        { level: "Critical", tone: "red", text: "Pump Failure, Line 2" },
    ];

    return (
        <div className="space-y-2">
            {items.map((it, idx) => (
                <div
                    key={idx}
                    className="flex items-center gap-3 rounded-lg border border-border bg-appbg px-3 py-2"
                >
                    <SeverityBadge level={it.level} tone={it.tone} />
                    <div className="text-sm text-textpri">{it.text}</div>
                </div>
            ))}
        </div>
    );
}

function SeverityBadge({ level, tone }) {
    const styles =
        tone === "red"
            ? "bg-error/10 text-error border-error/20"
            : "bg-amber-400/10 text-warning border-amber-400/20";

    return (
        <span className={`inline-flex items-center rounded-lg border px-2 py-[2px] text-xs font-semibold ${styles}`}>
            {level}
        </span>
    );
}

function CctvMock() {
    return (
        <div className="h-[170px] rounded-xl border border-border bg-gradient-to-b from-appbg to-border overflow-hidden relative">
            <div className="absolute inset-0 opacity-50">
                <div className="absolute left-4 top-4 h-10 w-16 rounded-md bg-surface/60" />
                <div className="absolute left-24 top-6 h-12 w-20 rounded-md bg-surface/60" />
                <div className="absolute right-6 bottom-6 h-16 w-24 rounded-md bg-surface/60" />
                <div className="absolute left-8 bottom-8 h-8 w-20 rounded-md bg-surface/60" />
            </div>
            <div className="absolute bottom-3 left-3 rounded-lg bg-surface/80 border border-border px-2 py-1 text-[11px] text-textpri">
                Live feed (mock)
            </div>
        </div>
    );
}

/* ------------------------- Icons (simple inline) ------------------------- */

function IconExpand() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-textsec" stroke="currentColor">
            <path
                d="M9 3H3v6M15 3h6v6M9 21H3v-6M15 21h6v-6"
                strokeWidth="2"
                strokeLinecap="round"
            />
        </svg>
    );
}

function IconChart() {
    return <TrendingUp size={22} className="text-[#2C97D4]" />;
}
function IconBolt() {
    return <Zap size={22} className="text-[#76C267]" />;
}
function IconUsers() {
    return <Users size={22} className="text-emerald-600" />;
}
function IconClock() {
    return <Clock size={22} className="text-error" />;
}
