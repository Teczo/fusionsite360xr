import { Eye, EyeOff, Zap, RotateCcw } from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_CAT_STATE = { visible: true, opacity: 1, highlighted: false };

const CATEGORY_DOT = {
    Structure:  "bg-blue-400",
    HVAC:       "bg-emerald-400",
    Piping:     "bg-cyan-400",
    Electrical: "bg-yellow-400",
    Valve:      "bg-orange-400",
    Pump:       "bg-red-400",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function patchCat(setCategoryState, cat, patch) {
    setCategoryState(prev => ({
        ...prev,
        [cat]: { ...(prev[cat] ?? DEFAULT_CAT_STATE), ...patch },
    }));
}

function isCatDirty(s) {
    return !s.visible || s.opacity < 1 || s.highlighted;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function FilterPanel({
    categories,
    categoryCounts,
    categoryState,
    setCategoryState,
    dimOthers,
    setDimOthers,
}) {
    const anyDirty = categories.some(cat => isCatDirty(categoryState[cat] ?? DEFAULT_CAT_STATE));
    const isDirty  = anyDirty || dimOthers;

    // ── Handlers ─────────────────────────────────────────────────────────────

    const handleResetAll = () => {
        setCategoryState(prev => {
            const reset = {};
            Object.keys(prev).forEach(cat => {
                reset[cat] = { ...DEFAULT_CAT_STATE };
            });
            return reset;
        });
        setDimOthers(false);
    };

    const handleResetCategory = (cat) => {
        patchCat(setCategoryState, cat, { ...DEFAULT_CAT_STATE });
    };

    const toggleVisible    = (cat) => patchCat(setCategoryState, cat, { visible:     !(categoryState[cat]?.visible     ?? true)  });
    const toggleHighlight  = (cat) => patchCat(setCategoryState, cat, { highlighted: !(categoryState[cat]?.highlighted ?? false) });
    const setOpacity       = (cat, value) => patchCat(setCategoryState, cat, { opacity: value });

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="absolute right-5 top-5 w-72 bg-[#0F172A]/95 backdrop-blur border border-white/10 rounded-2xl p-4 text-white z-20 max-h-[calc(100vh-3rem)] overflow-y-auto">

            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div>
                    <h2 className="text-sm font-semibold">Filter</h2>
                    <p className="text-white/40 text-xs mt-0.5">
                        {categories.length} {categories.length === 1 ? 'category' : 'categories'} detected
                    </p>
                </div>
                <button
                    onClick={handleResetAll}
                    disabled={!isDirty}
                    className="text-xs text-white/40 hover:text-white disabled:opacity-0 disabled:pointer-events-none transition-all px-2 py-1 rounded-lg hover:bg-white/10"
                >
                    Reset All
                </button>
            </div>

            {/* Dim Others toggle */}
            <button
                onClick={() => setDimOthers(p => !p)}
                className={[
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-xl mb-3 transition-colors text-sm border",
                    dimOthers
                        ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-300"
                        : "bg-white/5 border-transparent text-white/50 hover:text-white/80 hover:bg-white/8",
                ].join(" ")}
            >
                <span className="font-medium">Dim Others</span>
                {/* Toggle pill */}
                <span className={[
                    "w-9 h-5 rounded-full relative flex-shrink-0 transition-colors",
                    dimOthers ? "bg-cyan-500" : "bg-white/20",
                ].join(" ")}>
                    <span className={[
                        "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                        dimOthers ? "translate-x-4" : "translate-x-0.5",
                    ].join(" ")} />
                </span>
            </button>

            {/* Category list */}
            {categories.length === 0 ? (
                <p className="text-white/30 text-xs text-center py-4">No models loaded</p>
            ) : (
                <div className="space-y-1.5">
                    {categories.map(cat => {
                        const s           = categoryState[cat] ?? DEFAULT_CAT_STATE;
                        const { visible, opacity, highlighted } = s;
                        const count       = categoryCounts[cat] ?? 0;
                        const dot         = CATEGORY_DOT[cat] ?? "bg-white/30";
                        const catDirty    = isCatDirty(s);

                        return (
                            <div
                                key={cat}
                                className={[
                                    "rounded-xl border px-3 py-2.5 transition-colors",
                                    highlighted
                                        ? "border-cyan-500/40 bg-cyan-500/10"
                                        : !visible
                                            ? "border-white/5 bg-white/[0.03] opacity-60"
                                            : "border-white/[0.06] bg-white/[0.04]",
                                ].join(" ")}
                            >
                                {/* ── Top row: dot · name · count · controls ── */}
                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />

                                    <span className={[
                                        "flex-1 text-sm font-medium truncate transition-colors",
                                        visible ? "text-white/85" : "text-white/30 line-through",
                                    ].join(" ")}>
                                        {cat}
                                    </span>

                                    <span className="text-xs text-white/30 tabular-nums mr-1">{count}</span>

                                    {/* Eye — toggle visibility */}
                                    <button
                                        onClick={() => toggleVisible(cat)}
                                        title={visible ? "Hide category" : "Show category"}
                                        className={[
                                            "p-1 rounded-lg transition-colors",
                                            visible
                                                ? "text-white/50 hover:text-white hover:bg-white/10"
                                                : "text-white/25 hover:text-white/60 hover:bg-white/10",
                                        ].join(" ")}
                                    >
                                        {visible
                                            ? <Eye    className="w-3.5 h-3.5" />
                                            : <EyeOff className="w-3.5 h-3.5" />
                                        }
                                    </button>

                                    {/* Zap — highlight toggle */}
                                    <button
                                        onClick={() => toggleHighlight(cat)}
                                        title={highlighted ? "Remove highlight" : "Highlight category"}
                                        className={[
                                            "p-1 rounded-lg transition-colors",
                                            highlighted
                                                ? "text-cyan-400 bg-cyan-500/20 hover:bg-cyan-500/30"
                                                : "text-white/30 hover:text-yellow-400 hover:bg-white/10",
                                        ].join(" ")}
                                    >
                                        <Zap className="w-3.5 h-3.5" />
                                    </button>

                                    {/* RotateCcw — per-category reset */}
                                    <button
                                        onClick={() => handleResetCategory(cat)}
                                        disabled={!catDirty}
                                        title="Reset this category"
                                        className="p-1 rounded-lg text-white/20 hover:text-white/60 hover:bg-white/10 transition-colors disabled:opacity-0 disabled:pointer-events-none"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                    </button>
                                </div>

                                {/* ── Opacity slider ── */}
                                <div className="flex items-center gap-2">
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={opacity}
                                        onChange={e => setOpacity(cat, parseFloat(e.target.value))}
                                        className="flex-1 h-1 rounded-full appearance-none cursor-pointer accent-cyan-400 bg-white/10"
                                    />
                                    <span className="text-xs text-white/40 tabular-nums w-9 text-right">
                                        {Math.round(opacity * 100)}%
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
