// put at top of each section file
const fmt = {
    n: (v) => (v ?? 0).toLocaleString(),
    msToMin: (ms) => `${Math.round((ms ?? 0) / 1000 / 60)}m`,
    pct: (v) => `${Math.round((v ?? 0) * 100)}%`,
};

function Card({ title, subtitle, right, children }) {
    return (
        <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
                <div>
                    <div className="text-xs uppercase tracking-wider text-white/60">{subtitle}</div>
                    <h3 className="text-lg font-semibold">{title}</h3>
                </div>
                {right}
            </div>
            {children}
        </div>
    );
}
