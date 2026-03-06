import React, { useRef, useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { IconCamera, IconTarget } from "@tabler/icons-react";
import ScenePreviewCanvas from "./components/ScenePreviewCanvas";
import { scheduleApi, hseApi, bimApi } from "../services/api";
import AlertsList from "../components/ProjectModules/Alerts/AlertsList";
import ContractorPerformanceCard from "../components/ProjectModules/ContractorPerformanceCard";
import SCurvePanel from "../components/ProjectModules/SCurve/SCurvePanel";
import MediaGallery from "../components/ProjectModules/Media/MediaGallery";
import ProjectDocuments from "../components/ProjectModules/Documents/ProjectDocuments";

import MapCard from "../components/dashboard/cards/MapCard";
import WeatherCard from "../components/dashboard/cards/WeatherCard";
import LocationSetupCard from "../components/dashboard/cards/LocationSetupCard";
import LocationModal from "../components/modals/LocationModal";

import { toast } from "react-hot-toast";

/**
 * Digital Twin Dashboard (Mock UI + Mock Data)
 * Layout (Sidebar + Header) is provided by AppLayout via routing.
 * This component renders page content only.
 */
export default function DigitalTwinDashboard() {
    const [isTwinFullscreen, setIsTwinFullscreen] = useState(false);
    const [project, setProject] = useState(null);
    const [showLocationModal, setShowLocationModal] = useState(false);

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

    useEffect(() => {
        const handleOpenEditLocation = () => setShowLocationModal(true);
        window.addEventListener('open-edit-project-location', handleOpenEditLocation);
        return () => window.removeEventListener('open-edit-project-location', handleOpenEditLocation);
    }, []);

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
                    {/* S-Curve Panel */}
                    <Card>
                        <SCurvePanel projectId={projectId} />
                    </Card>
                </div>
            )}


            {/* 3D Digital Twin + S-Curve (Side-by-side on desktop) */}
            <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">


                <HSESummaryWidget projectId={projectId} />
                {/* 3D Digital Twin Panel */}
                <div className="rounded-2xl border border-[#E6EAF0] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.08)]">


                    {/* Top Bar */}
                    <div className="flex items-center justify-between p-4 border-b border-[#E6EAF0]">

                        {/* LEFT — Segmented Views */}
                        <div className="flex items-center rounded-xl border border-[#E6EAF0] bg-[#F9FAFB] p-1">
                            {[
                                { label: 'Overview', key: 'overview' },
                                { label: 'Top', key: 'top' },
                                { label: 'Side', key: 'side' },
                                { label: 'Ground', key: 'ground' },
                            ].map((v) => (
                                <button
                                    key={v.key}
                                    onClick={() => requestCamera(v.key)}
                                    className="px-4 py-1.5 text-xs font-medium text-[#374151] rounded-lg hover:bg-white transition"
                                >
                                    {v.label}
                                </button>
                            ))}
                        </div>

                        {/* RIGHT — Icon Controls */}
                        <div className="flex items-center gap-2">

                            <button
                                onClick={() => requestCamera('assetFocus')}
                                className="p-2 rounded-xl border border-[#E6EAF0] bg-white hover:bg-[#F9FAFB] transition"
                                title="Asset Focus"
                            >
                                <IconTarget className="w-4 h-4 text-[#374151]" />
                            </button>

                            <button
                                onClick={requestCapture}
                                className="p-2 rounded-xl border border-[#E6EAF0] bg-white hover:bg-[#F9FAFB] transition"
                                title="Capture View"
                            >
                                <IconCamera className="w-4 h-4 text-[#374151]" />
                            </button>

                            <button
                                onClick={() => setIsTwinFullscreen(true)}
                                className="p-2 rounded-xl border border-[#E6EAF0] bg-white hover:bg-[#F9FAFB] transition"
                                title="Expand"
                            >
                                <IconExpand className="w-4 h-4 text-[#374151]" />
                            </button>

                        </div>
                    </div>


                    <div className="relative h-[420px] overflow-hidden rounded-b-2xl bg-gradient-to-b from-[#F9FAFB] to-[#EEF2F7] min-w-0 min-h-0">
                        <ScenePreviewCanvas
                            projectId={projectId}
                            cameraRequest={cameraRequest}
                            captureRequest={captureRequest}
                        />
                        {/* Floating AR Button */}
                        {projectId && (
                            <button
                                onClick={() => {
                                    const deepLink = `fusionxr://open?projectId=${projectId}`;
                                    window.location.href = deepLink;
                                }}
                                className="absolute bottom-4 right-4 rounded-xl btn-gradient-primary px-4 py-2 text-xs font-semibold text-white shadow-lg hover:bg-indigo-500 transition"
                            >
                                View in AR
                            </button>
                        )}


                        {/* subtle vignette */}
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.0)_0%,rgba(0,0,0,0.05)_100%)]" />
                    </div>

                </div>

            </div>



            {/* Schedule Summary Widget */}
            {projectId && (
                <div className="mt-5">
                    <ScheduleSummaryWidget projectId={projectId} />
                </div>
            )}

            {/* HSE + Alerts + Contractor row */}
            {projectId && (
                <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">

                    <Card>
                        <AlertsList projectId={projectId} />
                    </Card>
                    <Card>
                        <ContractorPerformanceCard projectId={projectId} />
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
                        className="absolute inset-4 md:inset-8 rounded-2xl border border-[#E6EAF0] bg-white
                 shadow-[0_20px_60px_rgba(0,0,0,0.25)] overflow-hidden"
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E6EAF0]">
                            <div className="flex items-center gap-3 flex-wrap">

                                <div className="inline-flex items-center gap-2">
                                    <div className="inline-flex items-center gap-2 rounded-xl border border-[#E6EAF0] bg-[#F9FAFB] px-3 py-2">
                                        <span className="text-sm font-semibold text-[#111827]">3D Digital Twin</span>
                                        <span className="text-xs text-[#6B7280]">Fullscreen</span>
                                    </div>
                                </div>

                                <CameraPresetBar onPreset={requestCamera} />

                                <button
                                    onClick={requestCapture}
                                    className="rounded-xl border border-[#E6EAF0] bg-white px-3 py-2 text-xs font-semibold text-[#374151]
             hover:bg-[#F9FAFB] transition focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
                                    title="Capture View"
                                >
                                    Capture View
                                </button>

                                <button
                                    onClick={() => setIsTwinFullscreen(false)}
                                    className="inline-flex items-center justify-center rounded-xl border border-[#E6EAF0] bg-white px-3 py-2 text-sm
                     hover:bg-[#F9FAFB] transition"
                                    aria-label="Exit fullscreen"
                                    title="Exit fullscreen (Esc)"
                                >
                                    Exit Fullscreen
                                </button>


                            </div>
                        </div>

                        {/* Content */}
                        <div className="relative h-[calc(100%-64px)] bg-gradient-to-b from-[#F9FAFB] to-[#EEF2F7] min-w-0 min-h-0">
                            <ScenePreviewCanvas
                                projectId={projectId}
                                cameraRequest={cameraRequest}
                                captureRequest={captureRequest}
                            />


                            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.0)_0%,rgba(0,0,0,0.05)_100%)]" />
                        </div>
                    </div>
                </div>
            )}

            {showLocationModal && projectId && (
                <LocationModal
                    projectId={projectId}
                    projectLocation={project?.location}
                    onClose={() => setShowLocationModal(false)}
                    onSave={(newLocation) => {
                        setProject((prev) => ({
                            ...prev,
                            location: newLocation
                        }));
                    }}
                />
            )}
        </div>
    );
}




function CameraPresetBar({ onPreset }) {
    const Btn = ({ label, type }) => (
        <button
            onClick={() => onPreset(type)}
            className="rounded-xl border border-[#E6EAF0] bg-white px-3 py-2 text-xs font-semibold text-[#374151]
                 hover:bg-[#F9FAFB] transition focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
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

function KpiCard({ icon, title, value, sub, delta, deltaTone, foot }) {
    const deltaStyles =
        deltaTone === "up"
            ? "bg-[#DCFCE7] text-[#16A34A] border-[#BBF7D0]"
            : "bg-[#FEE2E2] text-[#DC2626] border-[#FCA5A5]";

    return (
        <div className="rounded-2xl border border-[#E6EAF0] bg-white p-4 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl border border-[#E6EAF0] bg-[#F3F6FB] flex items-center justify-center">
                        {icon}
                    </div>
                    <div className="text-sm font-semibold text-[#111827]">{title}</div>
                </div>

                <div className={`inline-flex items-center gap-1 rounded-lg border px-2 py-[2px] text-xs font-semibold ${deltaStyles}`}>
                    {deltaTone === "up" ? "↗" : "↘"} {delta}
                </div>
            </div>

            <div className="mt-3">
                <div className="text-3xl font-semibold text-[#111827] leading-none">{value}</div>
                <div className="mt-1 text-sm text-[#6B7280]">{sub}</div>
            </div>

            <div className="mt-2 text-xs text-[#9CA3AF]">{foot}</div>
        </div>
    );
}

/* ------------------------- Shared Card ------------------------- */

function Card({ title, menu, children }) {
    return (
        <div className="rounded-2xl border border-[#E6EAF0] bg-white p-4 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-[#111827]">{title}</div>
                {menu && <button className="text-[#9CA3AF] hover:text-[#6B7280]">•••</button>}
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
                            className="w-3 rounded-t-md bg-[#3B82F6]"
                            style={{ height: `${d.a}px` }}
                            title="Line A"
                        />
                        <div
                            className="w-3 rounded-t-md bg-[#22C55E]"
                            style={{ height: `${d.b}px` }}
                            title="Line B"
                        />
                    </div>
                ))}
            </div>

            <div className="mt-3 grid grid-cols-6 gap-2 text-[11px] text-[#6B7280]">
                {data.map((d) => (
                    <div key={d.label} className="text-center">
                        <div>{d.label}</div>
                        <div className="text-[#9CA3AF]">P1</div>
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
            ? "bg-[#22C55E]"
            : "bg-[#3B82F6]";

    return (
        <div>
            <div className="flex items-center justify-between text-xs text-[#6B7280]">
                <span>{label}</span>
                <span className="inline-flex items-center gap-2">
                    <span className="rounded-md border border-[#E6EAF0] bg-white px-2 py-[2px] text-[11px] font-semibold text-[#111827]">
                        {value}
                    </span>
                </span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-[#EEF2F7] overflow-hidden">
                <div className={`h-full ${bar}`} style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-[#9CA3AF]">
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
                    className="flex items-center gap-3 rounded-xl border border-[#E6EAF0] bg-[#F9FAFB] px-3 py-2"
                >
                    <SeverityBadge level={it.level} tone={it.tone} />
                    <div className="text-sm text-[#111827]">{it.text}</div>
                </div>
            ))}
        </div>
    );
}

function SeverityBadge({ level, tone }) {
    const styles =
        tone === "red"
            ? "bg-[#FEE2E2] text-[#B91C1C] border-[#FCA5A5]"
            : "bg-[#FEF3C7] text-[#92400E] border-[#FCD34D]";

    return (
        <span className={`inline-flex items-center rounded-lg border px-2 py-[2px] text-xs font-semibold ${styles}`}>
            {level}
        </span>
    );
}

function CctvMock() {
    return (
        <div className="h-[170px] rounded-xl border border-[#E6EAF0] bg-gradient-to-b from-[#EEF2F7] to-[#E5E7EB] overflow-hidden relative">
            <div className="absolute inset-0 opacity-50">
                <div className="absolute left-4 top-4 h-10 w-16 rounded-md bg-white/60" />
                <div className="absolute left-24 top-6 h-12 w-20 rounded-md bg-white/60" />
                <div className="absolute right-6 bottom-6 h-16 w-24 rounded-md bg-white/60" />
                <div className="absolute left-8 bottom-8 h-8 w-20 rounded-md bg-white/60" />
            </div>
            <div className="absolute bottom-3 left-3 rounded-lg bg-white/80 border border-[#E6EAF0] px-2 py-1 text-[11px] text-[#374151]">
                Live feed (mock)
            </div>
        </div>
    );
}

/* ── Schedule Summary Widget ── */
function ScheduleSummaryWidget({ projectId }) {
    const [activities, setActivities] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        if (!projectId) { setLoading(false); return; }
        scheduleApi.list(projectId)
            .then((data) => setActivities(Array.isArray(data) ? data : []))
            .catch(() => setActivities([]))
            .finally(() => setLoading(false));
    }, [projectId]);

    const total = activities.length;
    const completed = activities.filter(a => a.percentComplete >= 100 || a.status === 'Completed').length;
    const inProgress = activities.filter(a => (a.percentComplete > 0 && a.percentComplete < 100) || a.status === 'In Progress').length;
    const delayed = activities.filter(a => a.isDelayed || a.status === 'Delayed').length;
    const overallPct = total > 0
        ? Math.round(activities.reduce((sum, a) => sum + (a.percentComplete || 0), 0) / total)
        : 0;

    return (
        <div className="rounded-2xl border border-[#E6EAF0] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)] p-5">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <div className="text-sm font-semibold text-[#111827]">Project Schedule</div>
                    <div className="text-xs text-[#6B7280] mt-0.5">{total} activities</div>
                </div>
                <Link
                    to={`/timeline?id=${projectId}`}
                    className="text-xs font-semibold text-[#3BB2A5] hover:underline"
                >
                    View Full Timeline →
                </Link>
            </div>

            {loading ? (
                <div className="h-16 flex items-center justify-center text-xs text-[#9CA3AF]">Loading…</div>
            ) : total === 0 ? (
                <div className="h-16 flex items-center justify-center text-xs text-[#9CA3AF]">No schedule uploaded yet</div>
            ) : (
                <>
                    <div className="grid grid-cols-4 gap-3 mb-4">
                        {[
                            { label: 'Completed', value: completed, color: '#22C55E' },
                            { label: 'In Progress', value: inProgress, color: '#3BB2A5' },
                            { label: 'Delayed', value: delayed, color: '#EF4444' },
                            { label: 'Overall', value: `${overallPct}%`, color: '#6366F1' },
                        ].map((s) => (
                            <div key={s.label} className="rounded-xl border border-[#E6EAF0] bg-[#F9FAFB] px-3 py-2.5 text-center">
                                <div className="text-lg font-bold" style={{ color: s.color }}>{s.value}</div>
                                <div className="text-[11px] text-[#6B7280] mt-0.5">{s.label}</div>
                            </div>
                        ))}
                    </div>
                    <div className="h-2 rounded-full bg-[#EEF2F7] overflow-hidden">
                        <div
                            className="h-full rounded-full bg-[#3BB2A5] transition-all"
                            style={{ width: `${overallPct}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-[11px] text-[#9CA3AF] mt-1">
                        <span>0%</span>
                        <span>{overallPct}% complete</span>
                        <span>100%</span>
                    </div>
                </>
            )}
        </div>
    );
}

/* ── HSE Summary Widget ── */
function HSESummaryWidget({ projectId }) {
    const [incidents, setIncidents] = React.useState([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        if (!projectId) { setLoading(false); return; }
        hseApi.list(projectId)
            .then((data) => setIncidents(Array.isArray(data) ? data : []))
            .catch(() => setIncidents([]))
            .finally(() => setLoading(false));
    }, [projectId]);

    const total = incidents.length;
    const critical = incidents.filter(i => i.severity === 'Critical').length;
    const warning = incidents.filter(i => i.severity === 'Warning').length;
    const thisMonth = incidents.filter(i => {
        const d = new Date(i.date);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    const recent = incidents
        .slice()
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 3);

    return (
        <div className="rounded-2xl border border-[#E6EAF0] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)] p-5 h-full">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <div className="text-sm font-semibold text-[#111827]">HSE Management</div>
                    <div className="text-xs text-[#6B7280] mt-0.5">Health, Safety &amp; Environment</div>
                </div>
                <Link
                    to={`/hse?id=${projectId}`}
                    className="text-xs font-semibold text-[#3BB2A5] hover:underline"
                >
                    View Full HSE →
                </Link>
            </div>

            {loading ? (
                <div className="h-16 flex items-center justify-center text-xs text-[#9CA3AF]">Loading…</div>
            ) : (
                <>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                        {[
                            { label: 'Total', value: total, color: '#374151' },
                            { label: 'Critical', value: critical, color: '#EF4444' },
                            { label: 'This Month', value: thisMonth, color: '#F59E0B' },
                        ].map((s) => (
                            <div key={s.label} className="rounded-xl border border-[#E6EAF0] bg-[#F9FAFB] px-3 py-2.5 text-center">
                                <div className="text-lg font-bold" style={{ color: s.color }}>{s.value}</div>
                                <div className="text-[11px] text-[#6B7280] mt-0.5">{s.label}</div>
                            </div>
                        ))}
                    </div>

                    {recent.length === 0 ? (
                        <div className="text-xs text-[#9CA3AF] text-center py-4">No incidents recorded</div>
                    ) : (
                        <div className="space-y-2">
                            {recent.map((item) => {
                                const sev = item.severity;
                                const dotColor = sev === 'Critical' ? '#EF4444' : sev === 'Warning' ? '#F59E0B' : '#3BB2A5';
                                return (
                                    <div key={item._id} className="flex items-center gap-3 rounded-xl border border-[#E6EAF0] bg-[#F9FAFB] px-3 py-2">
                                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-medium text-[#111827] truncate">{item.title}</div>
                                            <div className="text-[11px] text-[#9CA3AF]">{new Date(item.date).toLocaleDateString()}</div>
                                        </div>
                                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md"
                                            style={{
                                                backgroundColor: sev === 'Critical' ? '#FEE2E2' : sev === 'Warning' ? '#FEF3C7' : '#D1FAE5',
                                                color: sev === 'Critical' ? '#B91C1C' : sev === 'Warning' ? '#92400E' : '#065F46',
                                            }}>
                                            {sev}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

/* ------------------------- Icons (simple inline) ------------------------- */

function IconExpand() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
                d="M9 3H3v6M15 3h6v6M9 21H3v-6M15 21h6v-6"
                stroke="#6B7280"
                strokeWidth="2"
                strokeLinecap="round"
            />
        </svg>
    );
}

function IconChart() {
    return <span className="text-[#2563EB] text-lg">📈</span>;
}
function IconBolt() {
    return <span className="text-[#16A34A] text-lg">⚡</span>;
}
function IconUsers() {
    return <span className="text-[#16A34A] text-lg">👤</span>;
}
function IconClock() {
    return <span className="text-[#DC2626] text-lg">🕒</span>;
}
