const fmt = {
    n: (v) => (v ?? 0).toLocaleString(),
    msToMin: (ms) => `${Math.round((ms ?? 0) / 1000 / 60)}m`,
    pct: (v) => `${Math.round((v ?? 0) * 100)}%`,
};

function Card({ title, subtitle, right, children }) {
    return (
        <div className="bg-surface border border-border rounded-xl p-5 shadow-card">
            <div className="flex items-center justify-between mb-4">
                <div>
                    {subtitle && <div className="text-xs font-medium text-texttert uppercase tracking-wider mb-0.5">{subtitle}</div>}
                    <h3 className="text-sm font-semibold text-textpri" style={{ fontFamily: "'Syne', 'Inter', sans-serif" }}>{title}</h3>
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
                <ul className="list-disc ml-5 text-textsec text-sm space-y-1">
                    <li>Users drop off near 40s — shorten your intro or reduce scene complexity.</li>
                    <li>Quiz 2 has low accuracy — consider rewording or adding a hint after one failure.</li>
                </ul>
            </Card>

            <Card title="Export" subtitle="Share with stakeholders">
                <div className="flex gap-2">
                    <button className="px-3 py-1.5 rounded-lg text-sm bg-appbg border border-border text-textpri hover:bg-borderlight transition-colors">
                        Download PDF
                    </button>
                    <button className="px-3 py-1.5 rounded-lg text-sm bg-appbg border border-border text-textpri hover:bg-borderlight transition-colors">
                        Export CSV
                    </button>
                </div>
            </Card>
        </div>
    );
}
