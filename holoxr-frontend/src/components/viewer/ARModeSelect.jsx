import { Link, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

export default function ARModeSelect() {
    const { id } = useParams();
    const [xrSupported, setXrSupported] = useState(null);
    const [isIOS, setIsIOS] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        // Basic WebXR support check (same logic as your current page)
        if (navigator.xr && navigator.xr.isSessionSupported) {
            navigator.xr
                .isSessionSupported("immersive-ar")
                .then((supported) => setXrSupported(supported))
                .catch(() => setXrSupported(false));
        } else {
            setXrSupported(false);
        }

        const ua = window.navigator.userAgent || "";
        setIsIOS(/iPad|iPhone|iPod/.test(ua) && !window.MSStream);
    }, []);

    const projectIdShort = useMemo(() => {
        if (!id) return "";
        return id.length > 18 ? `${id.slice(0, 10)}…${id.slice(-6)}` : id;
    }, [id]);

    const copyProjectId = async () => {
        try {
            await navigator.clipboard.writeText(id || "");
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
        } catch {
            // ignore
        }
    };

    return (
        <div className="min-h-dvh w-full bg-[#F6F8FB] text-[#111827]">
            {/* Top bar */}
            <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-[#E6EAF0]">
                <div className="mx-auto max-w-5xl px-4 sm:px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-[#EAF2FF] border border-[#D7E6FF] flex items-center justify-center">
                            <span className="text-[#2563EB] font-semibold">H</span>
                        </div>
                        <div className="leading-tight">
                            <div className="text-sm font-semibold text-[#111827]">HoloXR Viewer</div>
                            <div className="text-xs text-[#6B7280]">AR viewing mode selection</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="hidden sm:flex items-center gap-2 rounded-lg border border-[#E6EAF0] bg-white px-3 py-2">
                            <div className="text-xs text-[#6B7280]">Project</div>
                            <div className="text-xs font-mono text-[#111827]">{projectIdShort}</div>
                        </div>

                        <button
                            onClick={copyProjectId}
                            className="inline-flex items-center justify-center rounded-lg px-3 py-2 text-xs font-medium
                         bg-white border border-[#E6EAF0] hover:bg-[#F9FAFB] transition"
                            title="Copy Project ID"
                        >
                            {copied ? "Copied" : "Copy ID"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Page body */}
            <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-xl sm:text-2xl font-semibold text-[#111827]">
                        Choose AR viewing mode
                    </h1>
                    <p className="mt-1 text-sm text-[#6B7280]">
                        Select how you want to place and view this published scene in AR.
                    </p>
                </div>

                {/* Warnings / compatibility */}
                {xrSupported === false && (
                    <div
                        className="mb-6 rounded-xl border border-[#F6D58B] bg-[#FFFBEB] p-4
                       shadow-[0_4px_14px_rgba(0,0,0,0.05)]"
                    >
                        <div className="flex items-start gap-3">
                            <div className="mt-[2px] h-9 w-9 rounded-lg bg-white border border-[#E6EAF0] flex items-center justify-center">
                                <span className="text-sm">!</span>
                            </div>
                            <div className="flex-1">
                                <div className="text-sm font-semibold text-[#111827]">
                                    Heads up: WebXR AR not detected
                                </div>
                                <div className="mt-1 text-sm text-[#6B7280]">
                                    Your device or browser may not support WebXR AR sessions. You can still try
                                    Tap-to-place mode; if it fails, switch to a compatible device/browser.
                                    {isIOS && (
                                        <span>
                                            {" "}
                                            On iOS, use Safari with iOS 16.4+ (or a compatible WebXR viewer).
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main selection grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ModeCard
                        badge="Instant"
                        icon="⚡"
                        title="Auto-load (no tapping)"
                        description="Loads the scene immediately in AR. Best for guided demos or fixed setups."
                        to={`/ar/${id}`}
                        cta="Open Auto-load"
                        hint="Recommended for demos"
                    />

                    <ModeCard
                        badge="Manual"
                        icon="📍"
                        title="Tap-to-place"
                        description="Scan your space and tap on a surface to place the scene. Best for flexible positioning."
                        to={`/ar-plane/${id}`}
                        cta="Open Tap-to-place"
                        hint="Recommended for real placement"
                    />
                </div>

                {/* Footer tip */}
                <div className="mt-6 text-xs text-[#6B7280]">
                    Tip: If nothing appears, ensure camera permissions are granted and adequate lighting is available
                    for surface detection.
                </div>

                {/* Small route note (optional) */}
                <div className="mt-2 text-[11px] text-[#9CA3AF]">
                </div>
            </div>
        </div>
    );
}

function ModeCard({ badge, icon, title, description, to, cta, hint }) {
    return (
        <div
            className="rounded-2xl border border-[#E6EAF0] bg-white p-5
                 shadow-[0_10px_30px_rgba(0,0,0,0.08)]"
            style={{ borderWidth: 1 }}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                    <div className="h-11 w-11 rounded-xl bg-[#F3F6FB] border border-[#E6EAF0] flex items-center justify-center">
                        <span className="text-xl leading-none">{icon}</span>
                    </div>

                    <div>
                        <div className="flex items-center gap-2">
                            <div className="text-base font-semibold text-[#111827]">{title}</div>
                            <span
                                className="inline-flex items-center rounded-md px-2 py-[2px] text-[11px] font-medium
                           bg-[#F9FAFB] border border-[#E6EAF0] text-[#374151]"
                            >
                                {badge}
                            </span>
                        </div>
                        <div className="mt-1 text-sm text-[#6B7280]">{description}</div>
                    </div>
                </div>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
                <Link
                    to={to}
                    className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold
                     bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition
                     shadow-[0_6px_18px_rgba(37,99,235,0.25)]"
                >
                    {cta}
                </Link>

                <div className="text-xs text-[#6B7280]">{hint}</div>
            </div>
        </div>
    );
}
