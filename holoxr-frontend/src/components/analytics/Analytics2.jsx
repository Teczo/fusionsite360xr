import { useMemo, useState, useEffect } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    Funnel,
    FunnelChart,
    LabelList
} from "recharts";

// ---- Config ----
const API = import.meta.env.VITE_API_URL; // e.g. https://api.holoxr.com

// ---- Utility: tiny formatter helpers ----
const fmt = {
    n: (v) => (v ?? 0).toLocaleString(),
    msToMin: (ms) => `${Math.round((ms ?? 0) / 1000 / 60)}m`,
    pct: (v) => `${Math.round((v ?? 0) * 100)}%`,
};

// ---- Card primitive ----
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

// ---- KPI Row ----
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

// ---- Charts ----
function DailyLine({ data }) {
    return (
        <Card title="Daily Views" subtitle="Selected range">
            <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="views" strokeWidth={2} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
}

function EngagementFunnel({ data }) {
    return (
        <Card title="Engagement Funnel" subtitle="Open → Place → Interact → Quiz → Button">
            <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                    <FunnelChart>
                        <Tooltip />
                        <Funnel dataKey="value" data={data || []} isAnimationActive>
                            <LabelList position="right" fill="#fff" stroke="none" dataKey="name" />
                        </Funnel>
                    </FunnelChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
}

function DevicesPie({ data }) {
    return (
        <Card title="Devices" subtitle="Audience breakdown">
            <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Tooltip />
                        <Pie data={data || []} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                            {(data || []).map((_, i) => (
                                <Cell key={i} />
                            ))}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
}

function ReturningBar({ data }) {
    return (
        <Card title="Returning vs New" subtitle="Users">
            <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data || []} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="value">
                            {(data || []).map((_, i) => (
                                <Cell key={i} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
}

function RetentionLine({ data }) {
    return (
        <Card title="Retention Curve" subtitle="% viewers remaining over time">
            <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data || []} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="t" tick={{ fontSize: 12 }} label={{ value: "seconds", position: "insideBottom", offset: -2 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="pct" strokeWidth={2} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
}

function ObjectTable({ objects }) {
    return (
        <Card title="Object Interactions" subtitle="Models, quizzes & CTAs">
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead>
                        <tr className="text-left text-white/70">
                            <th className="py-2 pr-4">Object</th>
                            <th className="py-2 pr-4">Taps</th>
                            <th className="py-2 pr-4">Avg View</th>
                            <th className="py-2 pr-4">Correct Rate</th>
                            <th className="py-2 pr-4">CTR</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(objects || []).map((o) => (
                            <tr key={o.id} className="border-t border-white/10">
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

// ---- Data hooks (LIVE) ----
function useOverview(range) {
    const [data, setData] = useState(null);
    const [err, setErr] = useState(null);
    useEffect(() => {
        if (!API) return;
        fetch(`${API}/api/analytics/overview?range=${range}`, { credentials: "include" })
            .then((r) => r.json())
            .then(setData)
            .catch(setErr);
    }, [range]);
    return { data, err };
}

function useProject(projectId, range) {
    const [data, setData] = useState(null);
    const [err, setErr] = useState(null);
    useEffect(() => {
        if (!API || !projectId) return;
        fetch(`${API}/api/analytics/projects/${projectId}?range=${range}`, { credentials: "include" })
            .then((r) => r.json())
            .then(setData)
            .catch(setErr);
    }, [projectId, range]);
    return { data, err };
}

function useAudience(projectId, range) {
    const [data, setData] = useState(null);
    const [err, setErr] = useState(null);
    useEffect(() => {
        if (!API) return;
        const qs = new URLSearchParams();
        qs.set("range", String(range));
        if (projectId) qs.set("projectId", projectId);
        fetch(`${API}/api/analytics/audience?${qs.toString()}`, { credentials: "include" })
            .then((r) => r.json())
            .then(setData)
            .catch(setErr);
    }, [projectId, range]);
    return { data, err };
}

function useEngagement(projectId, range) {
    const [data, setData] = useState(null);
    const [err, setErr] = useState(null);
    useEffect(() => {
        if (!API || !projectId) return;
        fetch(`${API}/api/analytics/engagement/${projectId}?range=${range}`, { credentials: "include" })
            .then((r) => r.json())
            .then(setData)
            .catch(setErr);
    }, [projectId, range]);
    return { data, err };
}

// ---- Tabs ----
const TABS = ["Overview", "Projects", "Audience", "Engagement", "Reports"];

export default function AnalyticsDashboard({ projects = [] }) {
    const [tab, setTab] = useState("Overview");
    const [range, setRange] = useState(30); // days
    const [projectId, setProjectId] = useState(projects[0]?.id);

    const currentProject = useMemo(
        () => projects.find((p) => p.id === projectId) || projects[0],
        [projects, projectId]
    );

    // Live data per-tab
    const { data: overview } = useOverview(range);
    const { data: projectData } = useProject(currentProject?.id, range);
    const { data: audience } = useAudience(tab === "Audience" ? currentProject?.id : undefined, range);
    const { data: engagement } = useEngagement(currentProject?.id, range);

    return (
        <div className="flex flex-col gap-4">
            {/* Top controls */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex flex-wrap gap-2">
                    {TABS.map((t) => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`px-3 py-1.5 rounded-xl text-sm border transition ${tab === t
                                    ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-200"
                                    : "bg-white/5 border-white/10 text-white/80 hover:bg-white/10"
                                }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                    {/* Range picker */}
                    <select
                        className="bg-white/10 border border-white/10 rounded-xl px-3 py-1.5 text-sm"
                        value={range}
                        onChange={(e) => setRange(Number(e.target.value))}
                    >
                        <option value={7}>Last 7 days</option>
                        <option value={30}>Last 30 days</option>
                        <option value={90}>Last 90 days</option>
                    </select>

                    {/* Project picker for tabs that need it */}
                    {tab !== "Overview" && (
                        <select
                            className="bg-white/10 border border-white/10 rounded-xl px-3 py-1.5 text-sm"
                            value={projectId}
                            onChange={(e) => setProjectId(e.target.value)}
                        >
                            {projects.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
            </div>

            {/* Content */}
            {tab === "Overview" && (
                overview ? (
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                        <div className="xl:col-span-3">
                            <KPIRow totals={overview.totals} />
                        </div>
                        <div className="xl:col-span-2">
                            <DailyLine data={overview.daily} />
                        </div>
                        <div className="xl:col-span-1">
                            <EngagementFunnel data={overview.funnel} />
                        </div>
                    </div>
                ) : (
                    <div className="text-white/60">Loading overview…</div>
                )
            )}

            {tab === "Projects" && (
                projectData ? (
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                        <div className="xl:col-span-2">
                            <RetentionLine data={projectData.retention} />
                        </div>
                        <div className="xl:col-span-1">
                            <Card title="Views" subtitle={projectData.name}>
                                <div className="text-4xl font-semibold">{fmt.n(projectData.views)}</div>
                                <div className="text-white/60 text-sm mt-1">Selected range</div>
                            </Card>
                        </div>
                        <div className="xl:col-span-3">
                            <ObjectTable objects={projectData.objects} />
                        </div>
                    </div>
                ) : (
                    <div className="text-white/60">Loading project data…</div>
                )
            )}

            {tab === "Audience" && (
                audience ? (
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                        <div className="xl:col-span-1">
                            <DevicesPie data={audience.devices} />
                        </div>
                        <div className="xl:col-span-2">
                            <ReturningBar data={audience.newReturning} />
                        </div>
                    </div>
                ) : (
                    <div className="text-white/60">Loading audience…</div>
                )
            )}

            {tab === "Engagement" && (
                engagement ? (
                    <div className="grid grid-cols-1 gap-4">
                        <Card title="3D Heatmap" subtitle="Tap hotspots on model">
                            <div className="h-56 grid place-items-center text-white/60">
                                {/* Placeholder for future WebGL heatmap overlay */}
                                Coming soon: interactive 3D heatmap overlay on selected model.
                            </div>
                        </Card>
                        <Card title="Quiz Insights" subtitle="Question-by-question">
                            <div className="text-white/70 text-sm space-y-1">
                                {(engagement.quiz || []).map((q) => (
                                    <div key={q.quizId}>
                                        {q.quizId}: {fmt.n(q.attempts)} attempts • {fmt.pct(q.correctRate)} correct
                                    </div>
                                ))}
                            </div>
                        </Card>
                        <Card title="Button Conversions" subtitle="CTAs">
                            <div className="text-white/70 text-sm space-y-1">
                                {(engagement.ctas || []).map((c) => (
                                    <div key={c.ctaId}>{c.ctaId}: {fmt.n(c.clicks)} clicks</div>
                                ))}
                            </div>
                        </Card>
                    </div>
                ) : (
                    <div className="text-white/60">Loading engagement…</div>
                )
            )}

            {tab === "Reports" && (
                <div className="grid grid-cols-1 gap-4">
                    <Card title="AI Insights" subtitle="Auto-generated tips">
                        <ul className="list-disc ml-5 text-white/80 text-sm space-y-1">
                            <li>Users drop off near 40s — shorten your intro or reduce scene complexity.</li>
                            <li>Quiz 2 has low accuracy — consider rewording or adding a hint after one failure.</li>
                        </ul>
                    </Card>
                    <Card title="Export" subtitle="Share with stakeholders">
                        <div className="flex gap-2">
                            <button className="px-3 py-1.5 rounded-xl text-sm bg-white/10 border border-white/10 hover:bg-white/15">Download PDF</button>
                            <button className="px-3 py-1.5 rounded-xl text-sm bg-white/10 border border-white/10 hover:bg-white/15">Export CSV</button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}