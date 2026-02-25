// Category color dots — fallback to a neutral dot for unknown categories.
const CATEGORY_DOT = {
    Structure:  "bg-blue-400",
    HVAC:       "bg-emerald-400",
    Piping:     "bg-cyan-400",
    Electrical: "bg-yellow-400",
    Valve:      "bg-orange-400",
    Pump:       "bg-red-400",
};

export default function FilterPanel({
    categories,
    categoryCounts,
    activeCategories,
    setActiveCategories,
    filterMode,
    setFilterMode,
    categoryOpacity,
    setCategoryOpacity,
}) {
    const isFiltering      = activeCategories.length > 0;
    const hasOpacityChange = Object.values(categoryOpacity).some(v => v < 1);
    const isDirty          = isFiltering || filterMode !== "inclusive" || hasOpacityChange;

    // Checkbox "checked" = "is this category currently visible?"
    const isCategoryVisible = (cat) => {
        if (activeCategories.length === 0) return true;
        return filterMode === "inclusive"
            ? activeCategories.includes(cat)
            : !activeCategories.includes(cat);
    };

    const handleToggle = (cat) => {
        const visible = isCategoryVisible(cat);

        if (filterMode === "inclusive") {
            if (visible) {
                // Uncheck → hide: remove from active list
                if (activeCategories.length === 0) {
                    setActiveCategories(categories.filter(c => c !== cat));
                } else {
                    setActiveCategories(prev => prev.filter(c => c !== cat));
                }
            } else {
                setActiveCategories(prev => [...prev, cat]);
            }
        } else {
            // Exclusive mode
            if (visible) {
                // Uncheck → hide: add to exclusion list
                if (activeCategories.length === 0) {
                    setActiveCategories([cat]);
                } else {
                    setActiveCategories(prev => [...prev, cat]);
                }
            } else {
                // Check → show: remove from exclusion list
                setActiveCategories(prev => prev.filter(c => c !== cat));
            }
        }
    };

    const handleOpacityChange = (cat, value) => {
        setCategoryOpacity(prev => ({ ...prev, [cat]: value }));
    };

    const handleIsolate = () => {
        if (activeCategories.length === 0) return;
        setFilterMode("inclusive");
    };

    const handleReset = () => {
        setActiveCategories([]);
        setFilterMode("inclusive");
        setCategoryOpacity({});
    };

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
                    onClick={handleReset}
                    disabled={!isDirty}
                    className="text-xs text-white/40 hover:text-white disabled:opacity-0 disabled:pointer-events-none transition-all px-2 py-1 rounded-lg hover:bg-white/10"
                >
                    Reset
                </button>
            </div>

            {/* Mode toggle */}
            <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-3">
                <button
                    onClick={() => setFilterMode("inclusive")}
                    className={[
                        "flex-1 text-xs py-1.5 rounded-lg transition-all font-medium",
                        filterMode === "inclusive"
                            ? "bg-white/15 text-white"
                            : "text-white/40 hover:text-white/70",
                    ].join(" ")}
                >
                    Inclusive
                </button>
                <button
                    onClick={() => setFilterMode("exclusive")}
                    className={[
                        "flex-1 text-xs py-1.5 rounded-lg transition-all font-medium",
                        filterMode === "exclusive"
                            ? "bg-white/15 text-white"
                            : "text-white/40 hover:text-white/70",
                    ].join(" ")}
                >
                    Exclusive
                </button>
            </div>

            {/* Category list */}
            {categories.length === 0 ? (
                <p className="text-white/30 text-xs text-center py-4">
                    No models loaded
                </p>
            ) : (
                <div className="space-y-0.5 mb-3">
                    {categories.map(cat => {
                        const visible  = isCategoryVisible(cat);
                        const selected = activeCategories.includes(cat);
                        const count    = categoryCounts[cat] ?? 0;
                        const dot      = CATEGORY_DOT[cat] ?? "bg-white/30";
                        const opacity  = categoryOpacity[cat] ?? 1;

                        return (
                            <div
                                key={cat}
                                className={[
                                    "rounded-xl transition-colors",
                                    selected ? "bg-white/10" : "hover:bg-white/5",
                                ].join(" ")}
                            >
                                {/* Category row */}
                                <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        checked={visible}
                                        onChange={() => handleToggle(cat)}
                                        className="w-4 h-4 rounded accent-cyan-400 cursor-pointer flex-shrink-0"
                                    />
                                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
                                    <span className={[
                                        "flex-1 text-sm transition-colors",
                                        visible ? "text-white/85" : "text-white/30 line-through",
                                    ].join(" ")}>
                                        {cat}
                                    </span>
                                    <span className="text-xs text-white/30 tabular-nums">
                                        {count}
                                    </span>
                                </label>

                                {/* Opacity slider — only when category is selected */}
                                {selected && (
                                    <div className="px-3 pb-3">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs text-white/40">Opacity</span>
                                            <span className="text-xs text-white/60 tabular-nums w-9 text-right">
                                                {Math.round(opacity * 100)}%
                                            </span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.05"
                                            value={opacity}
                                            onChange={e =>
                                                handleOpacityChange(cat, parseFloat(e.target.value))
                                            }
                                            className="w-full h-1 rounded-full appearance-none cursor-pointer accent-cyan-400 bg-white/10"
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Action row: Isolate + Reset */}
            <div className="flex gap-2">
                <button
                    onClick={handleIsolate}
                    disabled={activeCategories.length === 0}
                    title="Show only selected categories (inclusive mode)"
                    className="flex-1 text-xs py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
                >
                    Isolate
                </button>
                <button
                    onClick={handleReset}
                    disabled={!isDirty}
                    className="flex-1 text-xs py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
                >
                    Reset
                </button>
            </div>
        </div>
    );
}
