import { useEffect, useState } from "react";
import {
    ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    BarChart, Bar, Cell
} from "recharts";

const API = import.meta.env.VITE_API_URL;

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

export default function AnalyticsProjects({ projectId, range }) {
    const [data, setData] = useState(null);
    const [err, setErr] = useState(null);

    useEffect(() => {
        if (!API || !projectId) return;
        fetch(`${API}/api/analytics/projects/${projectId}?range=${range}`, { credentials: "include" })
            .then((r) => r.json())
            .then((res) => {
                if (res && (res.retention || res.views || res.objects)) {
                    setData(res);
                } else {
                    const viewCount = res.events?.find?.((e) => e._id === "scene_loaded" || e._id === "viewer_open")?.count || 0;
                    setData({ retention: res.daily || [], views: viewCount, objects: res.events || [] });
                }
            })
            .catch(setErr);
    }, [projectId, range]);

    if (err) return <div className="text-error text-sm">Failed to load analytics: {err.message || String(err)}</div>;
    if (!data) return <div className="text-texttert text-sm">Loading project data…</div>;

    return (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2">
                <Card title="Retention Curve" subtitle="% viewers remaining over time">
                    <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data.retention || []} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                                <XAxis dataKey="t" tick={{ fontSize: 12 }} label={{ value: "seconds", position: "insideBottom", offset: -2 }} />
                                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Line type="monotone" dataKey="pct" stroke="#3BB2A5" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            <div className="xl:col-span-1">
                <Card title="Views" subtitle="Selected range">
                    <div className="text-3xl font-bold text-textpri" style={{ fontFamily: "'Syne', 'Inter', sans-serif" }}>{fmt.n(data.views)}</div>
                    <div className="text-texttert text-sm mt-1">Selected range</div>
                </Card>
            </div>

            <div className="xl:col-span-3">
                <ObjectTable objects={data.objects} />
            </div>
        </div>
    );
}

function ObjectTable({ objects }) {
    return (
        <Card title="Object Interactions" subtitle="Models, quizzes & CTAs">
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead>
                        <tr className="text-left text-textsec">
                            <th className="py-2 pr-4">Object</th>
                            <th className="py-2 pr-4">Taps</th>
                            <th className="py-2 pr-4">Avg View</th>
                            <th className="py-2 pr-4">Correct Rate</th>
                            <th className="py-2 pr-4">CTR</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(objects || []).map((o) => (
                            <tr key={o.id} className="border-t border-border">
                                <td className="py-2 pr-4 font-medium">{o.label}</td>
                                <td className="py-2 pr-4">{fmt.n(o.taps)}</td>
                                <td className="py-2 pr-4">{o.avgViewSec ? `${o.avgViewSec}s` : "—"}</td>
                                <td className="py-2 pr-4">{"correctRate" in o ? fmt.pct(o.correctRate) : "—"}</td>
                                <td className="py-2 pr-4">{"ctr" in o ? fmt.pct(o.ctr) : "—"}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}
