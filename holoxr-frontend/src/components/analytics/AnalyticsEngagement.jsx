import { useEffect, useState } from "react";
const API = import.meta.env.VITE_API_URL;

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

export default function AnalyticsEngagement({ projectId, range }) {
    const [data, setData] = useState(null);
    const [err, setErr] = useState(null);

    useEffect(() => {
        if (!API || !projectId) return;
        fetch(`${API}/api/analytics/engagement/${projectId}?range=${range}`, { credentials: "include" })
            .then((r) => r.json())
            .then((d) => setData({ ctas: d.ctas ?? d.clicks, quiz: d.quiz ?? d.quizzes }))
            .catch(setErr);
    }, [projectId, range]);

    if (err) return <div className="text-red-400">Failed to load analytics: {err.message || String(err)}</div>;
    if (!data) return <div className="text-white/60">Loading engagement…</div>;

    return (
        <div className="grid grid-cols-1 gap-4">
            <Card title="3D Heatmap" subtitle="Tap hotspots on model">
                <div className="h-56 grid place-items-center text-white/60">
                    Coming soon: interactive 3D heatmap overlay on selected model.
                </div>
            </Card>

            <Card title="Quiz Insights" subtitle="Question-by-question">
                <div className="text-white/70 text-sm space-y-1">
                    {(data.quiz || []).map((q) => (
                        <div key={q.quizId}>
                            {q.quizId}: {fmt.n(q.attempts)} attempts • {fmt.pct(q.correctRate)} correct
                        </div>
                    ))}
                </div>
            </Card>

            <Card title="Button Conversions" subtitle="CTAs">
                <div className="text-white/70 text-sm space-y-1">
                    {(data.ctas || []).map((c) => (
                        <div key={c.ctaId}>{c.ctaId}: {fmt.n(c.clicks)} clicks</div>
                    ))}
                </div>
            </Card>
        </div>
    );
}
