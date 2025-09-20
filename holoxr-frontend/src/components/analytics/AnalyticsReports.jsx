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

export default function AnalyticsReports() {
    return (
        <div className="grid grid-cols-1 gap-4">
            <Card title="AI Insights" subtitle="Auto-generated tips">
                <ul className="list-disc ml-5 text-white/80 text-sm space-y-1">
                    <li>Users drop off near 40s — shorten your intro or reduce scene complexity.</li>
                    <li>Quiz 2 has low accuracy — consider rewording or adding a hint after one failure.</li>
                </ul>
            </Card>

            <Card title="Export" subtitle="Share with stakeholders">
                <div className="flex gap-2">
                    <button className="px-3 py-1.5 rounded-xl text-sm bg-white/10 border border-white/10 hover:bg-white/15">
                        Download PDF
                    </button>
                    <button className="px-3 py-1.5 rounded-xl text-sm bg-white/10 border border-white/10 hover:bg-white/15">
                        Export CSV
                    </button>
                </div>
            </Card>
        </div>
    );
}
