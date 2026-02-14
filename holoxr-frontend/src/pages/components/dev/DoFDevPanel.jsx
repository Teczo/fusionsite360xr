import React from "react";

export default function DoFDevPanel({
    enabled,
    settings,
    setEnabled,
    setSettings,
    title = "Depth of Field (Dev Tools)",
}) {
    const update = (key, value) => {
        setSettings((prev) => ({ ...prev, [key]: value }));
    };

    return (
        <section className="absolute top-4 right-4 z-50 w-[320px] rounded-2xl border border-[#E6EAF0] bg-white/95 backdrop-blur px-4 py-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="text-sm font-semibold text-[#111827]">{title}</div>
                    <div className="text-xs text-[#6B7280]">
                        Tune blur look + performance. Remove/disable in production.
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => setEnabled((v) => !v)}
                    className={[
                        "shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold border",
                        enabled
                            ? "bg-[#2563EB] text-white border-[#2563EB]"
                            : "bg-white text-[#111827] border-[#E6EAF0]",
                    ].join(" ")}
                >
                    {enabled ? "ON" : "OFF"}
                </button>
            </div>

            <div className="mt-4 space-y-4">
                <Slider
                    label="bokehScale"
                    value={settings.bokehScale}
                    min={0}
                    max={10}
                    step={0.1}
                    disabled={!enabled}
                    onChange={(v) => update("bokehScale", v)}
                    hint="Strength of blur (higher = blurrier)."
                />

                <Slider
                    label="focalLength"
                    value={settings.focalLength}
                    min={0.0}
                    max={0.2}
                    step={0.001}
                    disabled={!enabled}
                    onChange={(v) => update("focalLength", v)}
                    hint="Blur falloff feel (small changes matter)."
                />

                <Slider
                    label="focusDistance"
                    value={settings.focusDistance}
                    min={0}
                    max={1}
                    step={0.001}
                    disabled={!enabled}
                    onChange={(v) => update("focusDistance", v)}
                    hint="0 = near plane, 1 = far plane (normalized)."
                />

                <Slider
                    label="height"
                    value={settings.height}
                    min={120}
                    max={1080}
                    step={10}
                    disabled={!enabled}
                    onChange={(v) => update("height", v)}
                    hint="Quality/performance (lower = faster)."
                />

                <div className="pt-2 flex items-center justify-between gap-2">
                    <button
                        type="button"
                        disabled={!enabled}
                        onClick={() =>
                            setSettings({
                                bokehScale: 2.0,
                                focalLength: 0.02,
                                focusDistance: 0.15,
                                height: 480,
                            })
                        }
                        className={[
                            "w-full rounded-xl border px-3 py-2 text-xs font-semibold",
                            enabled
                                ? "border-[#E6EAF0] bg-white text-[#111827] hover:bg-[#F9FAFB]"
                                : "border-[#F3F4F6] bg-[#F9FAFB] text-[#9CA3AF] cursor-not-allowed",
                        ].join(" ")}
                    >
                        Reset defaults
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            // Quick “hide” without removing code (optional)
                            const el = document.getElementById("dof-dev-panel");
                            if (el) el.style.display = "none";
                        }}
                        className="hidden"
                    >
                        Hide
                    </button>
                </div>
            </div>
        </section>
    );
}

function Slider({ label, value, min, max, step, onChange, hint, disabled }) {
    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-[#111827]">{label}</div>
                <div className="text-xs tabular-nums text-[#374151]">{Number(value).toFixed(3)}</div>
            </div>

            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className={[
                    "w-full",
                    disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
                ].join(" ")}
            />

            {hint ? <div className="text-[11px] text-[#6B7280]">{hint}</div> : null}
        </div>
    );
}
