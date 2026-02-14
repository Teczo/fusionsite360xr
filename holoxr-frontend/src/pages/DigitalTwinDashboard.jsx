import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import ScenePreviewCanvas from "./components/ScenePreviewCanvas";
import TimelineList from "../components/ProjectModules/Timeline/TimelineList";
import HSEList from "../components/ProjectModules/HSE/HSEList";
import AlertsList from "../components/ProjectModules/Alerts/AlertsList";
import SCurvePanel from "../components/ProjectModules/SCurve/SCurvePanel";
import MediaGallery from "../components/ProjectModules/Media/MediaGallery";
/**
 * Digital Twin Dashboard (Mock UI + Mock Data)
 * Tailwind-only. No tailwind.config theme required. No global CSS required.
 */
export default function DigitalTwinDashboard() {
    const [isTwinFullscreen, setIsTwinFullscreen] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState(null);

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


    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key === "Escape") setIsTwinFullscreen(false);
        };
        if (isTwinFullscreen) window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [isTwinFullscreen]);

    return (
        <div className="min-h-dvh bg-[#F6F8FB] text-[#111827]">
            <div className="flex min-h-dvh">
                <Sidebar />

                <main className="flex-1">
                    <TopBar />

                    <div className="mx-auto w-full px-10 py-5">
                        {/* KPI cards */}
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <KpiCard
                                icon={<IconChart />}
                                title="Production Output"
                                value="47,032"
                                sub="Units today"
                                delta="+5.8%"
                                deltaTone="up"
                                foot="vs last period"
                            />
                            <KpiCard
                                icon={<IconBolt />}
                                title="Overall OEE"
                                value="92.3%"
                                sub="Target: 90%"
                                delta="+2.1%"
                                deltaTone="up"
                                foot="vs last period"
                            />
                            <KpiCard
                                icon={<IconUsers />}
                                title="Active Workforce"
                                value="3,247"
                                sub="Across all facilities"
                                delta="+1.2%"
                                deltaTone="up"
                                foot="vs last period"
                            />
                            <KpiCard
                                icon={<IconClock />}
                                title="Downtime Hours"
                                value="12.4"
                                sub="vs. last week"
                                delta="-18%"
                                deltaTone="down"
                                foot="vs last period"
                            />
                        </div>

                        {/* 3D Digital Twin Panel */}
                        <div className="mt-5 rounded-2xl border border-[#E6EAF0] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
                            <div className="flex items-center gap-3">

                                <div className="inline-flex items-center gap-2">
                                    <div className="inline-flex items-center gap-2 rounded-xl border border-[#E6EAF0] bg-[#F9FAFB] px-3 py-2">
                                        <span className="text-sm font-semibold text-[#111827]">3D Digital Twin</span>
                                        <span className="text-xs text-[#6B7280]">▼</span>
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
                                    onClick={() => setIsTwinFullscreen(true)}
                                    className="inline-flex items-center justify-center rounded-xl border border-[#E6EAF0] bg-white p-2 hover:bg-[#F9FAFB] transition"
                                    aria-label="Expand"
                                    title="Expand"
                                >
                                    <IconExpand />
                                </button>

                            </div>

                            <div className="relative h-[420px] overflow-hidden rounded-b-2xl bg-gradient-to-b from-[#F9FAFB] to-[#EEF2F7]">
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

                        {/* Project Modules (when projectId is present) */}
                        {projectId && (
                            <div className="mt-5 space-y-5">
                                {/* S-Curve + Timeline row */}
                                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                                    <Card title="S-Curve Progress">
                                        <SCurvePanel projectId={projectId} />
                                    </Card>
                                    <Card title="Project Timeline">
                                        <TimelineList projectId={projectId} />
                                    </Card>
                                </div>

                                {/* HSE + Alerts row */}
                                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                                    <Card title="HSE Overview">
                                        <HSEList projectId={projectId} />
                                    </Card>
                                    <Card title="Alerts">
                                        <AlertsList projectId={projectId} />
                                    </Card>
                                </div>

                                {/* Media Gallery */}
                                <Card title="Media Gallery">
                                    <MediaGallery projectId={projectId} />
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
                    </div>
                    {isTwinFullscreen && (
                        <div
                            className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm"
                            onMouseDown={(e) => {
                                // Only close if the user clicked the backdrop itself (not inside the dialog)
                                if (e.target === e.currentTarget) setIsTwinFullscreen(false);
                            }}
                        >
                            {/* Dialog */}
                            <div
                                className="absolute inset-4 md:inset-8 rounded-2xl border border-[#E6EAF0] bg-white
                 shadow-[0_20px_60px_rgba(0,0,0,0.25)] overflow-hidden"
                                onMouseDown={(e) => e.stopPropagation()} // prevents backdrop close
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between px-5 py-4 border-b border-[#E6EAF0]">
                                    <div className="flex items-center gap-3">

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
                                <div className="relative h-[calc(100%-64px)] bg-gradient-to-b from-[#F9FAFB] to-[#EEF2F7]">
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

                </main>
            </div>
        </div>
    );
}

function AssetInfoPanel({ asset, onClear, className = "" }) {
    if (!asset) return null;

    const badge =
        asset.status === "Healthy"
            ? "bg-green-50 text-green-700 border-green-200"
            : asset.status === "Maintenance"
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-red-50 text-red-700 border-red-200";

    return (
        <div
            className={
                "w-[320px] rounded-2xl border border-[#E6EAF0] bg-white shadow-sm overflow-hidden " +
                className
            }
        >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#E6EAF0]">
                <div className="text-sm font-semibold text-[#111827]">Asset Info</div>
                <button
                    onClick={onClear}
                    className="text-xs font-semibold text-[#6B7280] hover:text-[#111827]"
                >
                    Clear
                </button>
            </div>

            <div className="px-4 py-3 space-y-3">
                <div>
                    <div className="text-xs text-[#6B7280]">Asset Name</div>
                    <div className="text-sm font-semibold text-[#111827]">{asset.name || "—"}</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <div className="text-xs text-[#6B7280]">Type</div>
                        <div className="text-sm font-semibold text-[#111827]">{asset.type || "—"}</div>
                    </div>
                    <div>
                        <div className="text-xs text-[#6B7280]">Category</div>
                        <div className="text-sm font-semibold text-[#111827]">{asset.category || "—"}</div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 items-end">
                    <div>
                        <div className="text-xs text-[#6B7280]">Status</div>
                        <div className={"inline-flex items-center rounded-xl border px-2 py-1 text-xs font-semibold " + badge}>
                            {asset.status || "—"}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs text-[#6B7280]">Last Updated</div>
                        <div className="text-sm font-semibold text-[#111827]">
                            {asset.lastUpdated || "—"}
                        </div>
                    </div>
                </div>

                {asset.hint && (
                    <div className="text-xs text-[#6B7280]">
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

/* ------------------------- Sidebar ------------------------- */


import {
    LayoutDashboard,
    Wrench,
    Boxes,
    Radio,
    BarChart3,
    ShieldCheck,
    Settings,
} from "lucide-react";

export function Sidebar() {
    const items = [
        { label: "Dashboard", icon: LayoutDashboard, active: true },
        { label: "Operations", icon: Wrench },
        { label: "Digital Twin", icon: Boxes },
        { label: "IoT & Assets", icon: Radio },
        { label: "Analytics", icon: BarChart3 },
        { label: "Quality & Safety", icon: ShieldCheck },
    ];

    return (
        <aside className="w-[300px] bg-white border-r border-[#E6EAF0] flex flex-col">
            {/* Header */}
            <div className="h-16 flex items-center px-6 border-b border-[#EEF2F7]">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-[#EAF2FF] border border-[#D7E6FF] flex items-center justify-center">
                        <span className="text-[#2563EB] font-semibold">A</span>
                    </div>
                    <div className="leading-tight">
                        <div className="text-sm font-semibold text-[#111827]">Ansell</div>
                        <div className="text-xs text-[#6B7280]">Digital Twin</div>
                    </div>
                </div>
            </div>

            {/* Nav */}
            <nav className="px-3 py-4 flex-1">
                <div className="space-y-1">
                    {items.map((it) => {
                        const Icon = it.icon;
                        return (
                            <button
                                key={it.label}
                                className={[
                                    "group relative w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition",
                                    "focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20",
                                    it.active
                                        ? "bg-[#EAF2FF] text-[#1D4ED8]"
                                        : "text-[#374151] hover:bg-[#F3F4F6]",
                                ].join(" ")}
                            >
                                {it.active && (
                                    <span className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-full bg-[#2563EB]" />
                                )}

                                <span
                                    className={[
                                        "inline-flex h-9 w-9 items-center justify-center rounded-xl border transition",
                                        it.active
                                            ? "bg-white border-[#D7E6FF]"
                                            : "bg-white border-transparent group-hover:border-[#E6EAF0]",
                                    ].join(" ")}
                                >
                                    <Icon className="h-[18px] w-[18px]" />
                                </span>

                                <span className={it.active ? "font-semibold" : "font-medium"}>
                                    {it.label}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Bottom section (single Settings) */}
                <div className="mt-6 px-2">
                    <div className="text-xs text-[#9CA3AF] mb-2">System</div>

                    <button className="group w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-[#374151] hover:bg-[#F3F4F6] transition focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-transparent group-hover:border-[#E6EAF0] transition">
                            <Settings className="h-[18px] w-[18px]" />
                        </span>
                        <span className="font-medium">Settings</span>
                    </button>
                </div>
            </nav>
        </aside>
    );
}


/* ------------------------- TopBar ------------------------- */
function TopBar() {
    return (
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-[#E6EAF0]">
            <div className="mx-auto w-full px-1 h-16 grid grid-cols-[1fr_auto_1fr] items-center">



                {/* CENTER ZONE — SEARCH */}
                <div className="flex px-10 ">
                    <div className="w-full max-w-[560px]">
                        <div className="flex items-center gap-2 rounded-xl border border-[#E6EAF0] bg-white px-3 py-2
                            shadow-[0_4px_14px_rgba(0,0,0,0.05)]">
                            <IconSearch />
                            <input
                                className="w-full bg-transparent outline-none text-sm text-[#111827]
                           placeholder:text-[#9CA3AF]"
                                placeholder="Search modules, assets, alerts..."
                            />
                        </div>
                    </div>
                </div>
                {/* LEFT ZONE (empty for now, keeps balance) */}
                <div className="flex items-center gap-4">
                    {/* Optional: page title or breadcrumbs later */}
                </div>

                {/* RIGHT ZONE */}
                <div className="flex items-center justify-end gap-3">

                    {/* Notifications */}
                    <button
                        className="relative inline-flex items-center justify-center rounded-xl border border-[#E6EAF0]
                       bg-white p-2 hover:bg-[#F9FAFB] transition"
                        aria-label="Notifications"
                    >
                        <IconBell />
                        <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full
                             bg-[#EF4444] text-white text-[11px] font-semibold
                             flex items-center justify-center border-2 border-white">
                            3
                        </span>
                    </button>

                    {/* Date / Time */}
                    <div className="hidden sm:flex flex-col leading-tight items-end">
                        <div className="text-sm font-semibold text-[#111827]">23:56</div>
                        <div className="text-xs text-[#6B7280]">Thu, Dec 11, 2025</div>
                    </div>

                    {/* User */}
                    <div className="flex items-center gap-3 rounded-2xl border border-[#E6EAF0]
                          bg-white px-3 py-2 shadow-[0_4px_14px_rgba(0,0,0,0.05)]">
                        <div className="h-9 w-9 rounded-full bg-[#E5E7EB] border border-[#E6EAF0]" />
                        <div className="hidden sm:block leading-tight">
                            <div className="text-sm font-semibold text-[#111827]">Ahmad Hassan</div>
                            <div className="text-xs text-[#6B7280]">Operations Manager</div>
                        </div>
                        <span className="text-xs text-[#6B7280]">▼</span>
                    </div>
                </div>

            </div>
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

function TooltipCard({ className = "", title, lines }) {
    return (
        <div
            className={[
                "absolute z-10 w-[200px] rounded-xl border border-[#E6EAF0] bg-white p-3",
                "shadow-[0_6px_18px_rgba(0,0,0,0.08)]",
                className,
            ].join(" ")}
        >
            <div className="text-xs font-semibold text-[#111827]">{title}</div>
            <div className="mt-1 space-y-1 text-xs text-[#374151]">
                {lines.map((l) => (
                    <div key={l}>{l}</div>
                ))}
            </div>
        </div>
    );
}

function DiagnosticsCard({ className = "" }) {
    return (
        <div
            className={[
                "absolute z-10 w-[240px] rounded-xl border border-[#E6EAF0] bg-white p-3",
                "shadow-[0_6px_18px_rgba(0,0,0,0.08)]",
                className,
            ].join(" ")}
        >
            <div className="text-xs font-semibold text-[#111827]">Diagnostics</div>
            <div className="mt-2 space-y-1 text-xs text-[#374151]">
                <div>Temperature: 145°C</div>
                <div>Pressure: 8.2 bar</div>
                <div>Flow Rate: 230 L/min</div>
                <div>Vibration: 0.15 g</div>
            </div>

            <div className="mt-3 rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] px-2 py-1 text-xs font-semibold text-[#B91C1C] inline-flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-[#EF4444]" />
                Maintenance Required
            </div>
        </div>
    );
}

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

/* ------------------------- Icons (simple inline) ------------------------- */

function IconSearch() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
                d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                stroke="#9CA3AF"
                strokeWidth="2"
            />
            <path
                d="M16.5 16.5 21 21"
                stroke="#9CA3AF"
                strokeWidth="2"
                strokeLinecap="round"
            />
        </svg>
    );
}

function IconBell() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
                d="M15 17H9c-2.2 0-4-.8-4-3 0-1.9 1-2.7 1.6-3.5.5-.6.9-1.3.9-2.5a4.5 4.5 0 0 1 9 0c0 1.2.4 1.9.9 2.5.6.8 1.6 1.6 1.6 3.5 0 2.2-1.8 3-4 3Z"
                stroke="#6B7280"
                strokeWidth="2"
                strokeLinejoin="round"
            />
            <path
                d="M10 20a2 2 0 0 0 4 0"
                stroke="#6B7280"
                strokeWidth="2"
                strokeLinecap="round"
            />
        </svg>
    );
}

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

function IconGrid() {
    return <span>▦</span>;
}
function IconGear() {
    return <span>⚙</span>;
}
function IconCube() {
    return <span>◼</span>;
}
function IconWifi() {
    return <span>⌁</span>;
}
function IconChartMini() {
    return <span>▤</span>;
}
function IconShield() {
    return <span>🛡</span>;
}
function IconSettings() {
    return <span>⚙</span>;
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
