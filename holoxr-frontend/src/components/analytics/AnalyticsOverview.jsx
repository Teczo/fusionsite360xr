import { useEffect, useState } from "react";
import {
    ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    FunnelChart, Funnel, LabelList
} from "recharts";

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

export default function AnalyticsOverview({ range }) {
    const [data, setData] = useState(null);
    const [err, setErr] = useState(null);

    useEffect(() => {
        if (!API) return;
        fetch(`${API}/api/analytics/overview?range=${range}`, { credentials: "include" })
            .then((r) => r.json())
            .then((raw) => {
                const shaped = {
                    totals: {
                        views: raw.views ?? raw.totalEvents ?? 0,
                        uniques: raw.uniques ?? raw.uniqueSessions ?? 0,
                        avgSessionMs: raw.avgSessionMs ?? raw.avgSession ?? 0,
                    },
                    daily: (raw.daily ?? raw.dailyEvents ?? []).map((d) => ({
                        day: d.day ?? d.date,
                        views: d.views ?? d.totalEvents ?? d.count ?? 0,
                    })),
                    funnel: (raw.funnel ?? raw.funnelData)
                        ? (raw.funnel ?? raw.funnelData).map((f) => ({ name: f.name ?? f.step, value: f.value ?? f.count ?? 0 }))
                        : null,
                };
                setData(shaped);
            })
            .catch(setErr);
    }, [range]);

    if (err) return <div className="text-red-400">Failed to load analytics: {err.message || String(err)}</div>;
    if (!data) return <div className="text-white/60">Loading overview…</div>;

    return (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-3">
                <KPIRow totals={data.totals} />
            </div>

            <div className="xl:col-span-2">
                <Card title="Daily Views" subtitle="Selected range">
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data.daily} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Line type="monotone" dataKey="views" stroke="#8dd1e1" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            {data.funnel && (
                <div className="xl:col-span-1">
                    <Card title="Engagement Funnel" subtitle="Open → Place → Interact → Quiz → Button">
                        <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                                <FunnelChart>
                                    <Tooltip />
                                    <Funnel dataKey="value" data={data.funnel} isAnimationActive>
                                        <LabelList position="right" fill="#fff" stroke="none" dataKey="name" />
                                    </Funnel>
                                </FunnelChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}

function KPIRow({ totals }) {
    const items = [
        { label: "Total Views", value: fmt.n(totals?.views) },
        { label: "Unique Users", value: fmt.n(totals?.uniques) },
        { label: "Avg Session", value: fmt.msToMin(totals?.avgSessionMs) },
    ];
    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {items.map((k) => (
                <Card key={k.label} title={k.value} subtitle={k.label}>
                    <div className="text-white/70 text-sm">Last period</div>
                </Card>
            ))}
        </div>
    );
}
