import { useMemo } from 'react';

// Mirrors the categorize function in ScenePreviewCanvas (module-level)
function categorize(name = "") {
    const s = name.toLowerCase();
    if (s.includes("pump"))                       return "Pump";
    if (s.includes("valve"))                      return "Valve";
    if (s.includes("hvac") || s.includes("duct")) return "HVAC";
    if (s.includes("cable") || s.includes("elect")) return "Electrical";
    if (s.includes("pipe"))                       return "Piping";
    return "Structure";
}

export default function FilterPanel({ categories, models, activeCategories, setActiveCategories }) {
    // Count models per category
    const countByCategory = useMemo(() => {
        const map = {};
        models.forEach(m => {
            const cat = categorize(m.name);
            map[cat] = (map[cat] ?? 0) + 1;
        });
        return map;
    }, [models]);

    const toggleCategory = (cat) => {
        setActiveCategories(prev =>
            prev.includes(cat)
                ? prev.filter(c => c !== cat)
                : [...prev, cat]
        );
    };

    const showAll = () => setActiveCategories([]);

    const isFiltering = activeCategories.length > 0;

    return (
        <div className="absolute right-5 top-5 w-72 bg-[#0F172A]/95 backdrop-blur border border-white/10 rounded-2xl p-4 text-white z-20">

            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-sm font-semibold">Filter</h2>
                    <p className="text-white/40 text-xs mt-0.5">
                        {categories.length} {categories.length === 1 ? 'category' : 'categories'} detected
                    </p>
                </div>
                {isFiltering && (
                    <button
                        onClick={showAll}
                        className="text-xs text-white/50 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/10"
                    >
                        Show All
                    </button>
                )}
            </div>

            {/* Category list */}
            {categories.length === 0 ? (
                <p className="text-white/30 text-xs text-center py-4">
                    No models loaded
                </p>
            ) : (
                <div className="space-y-1">
                    {categories.map(cat => {
                        const checked = activeCategories.length === 0 || activeCategories.includes(cat);
                        const count   = countByCategory[cat] ?? 0;

                        return (
                            <label
                                key={cat}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-white/5 transition-colors group"
                            >
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => {
                                        if (activeCategories.length === 0) {
                                            // First toggle: hide everything except this one
                                            setActiveCategories(categories.filter(c => c !== cat));
                                        } else {
                                            toggleCategory(cat);
                                        }
                                    }}
                                    className="w-4 h-4 rounded accent-cyan-400 cursor-pointer"
                                />
                                <span className="flex-1 text-sm text-white/80 group-hover:text-white transition-colors">
                                    {cat}
                                </span>
                                <span className="text-xs text-white/30 tabular-nums">
                                    {count}
                                </span>
                            </label>
                        );
                    })}
                </div>
            )}

            {/* Show All footer button — visible only when filtering */}
            {isFiltering && (
                <button
                    onClick={showAll}
                    className="mt-3 w-full text-xs text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl py-2 transition-colors"
                >
                    Show All Categories
                </button>
            )}
        </div>
    );
}
