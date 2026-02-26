import { useEffect, useState } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const API = import.meta.env.VITE_API_URL;
const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#8dd1e1"];

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

export default function AnalyticsAudience({ range, projectId }) {
    const [data, setData] = useState(null);
    const [err, setErr] = useState(null);

    useEffect(() => {
        if (!API) return;
        const qs = new URLSearchParams();
        qs.set("range", String(range));
        if (projectId) qs.set("projectId", projectId);
        fetch(`${API}/api/analytics/audience?${qs.toString()}`, { credentials: "include" })
            .then((r) => r.json())
            .then((raw) => setData({ platforms: raw.platforms || [], langs: raw.langs || [] }))
            .catch(setErr);
    }, [projectId, range]);

    if (err) return <div className="text-error text-sm">Failed to load analytics: {err.message || String(err)}</div>;
    if (!data) return <div className="text-texttert text-sm">Loading audience…</div>;

    return (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-1">
                <Card title="Devices" subtitle="Audience breakdown">
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Tooltip />
                                <Pie data={data.platforms} dataKey="count" nameKey="_id" innerRadius={50} outerRadius={80}>
                                    {(data.platforms || []).map((_, i) => (
                                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            <div className="xl:col-span-2">
                <Card title="Languages" subtitle="User locale breakdown">
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.langs} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                <XAxis dataKey="_id" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Bar dataKey="count">
                                    {(data.langs || []).map((_, i) => (
                                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>
        </div>
    );
}
