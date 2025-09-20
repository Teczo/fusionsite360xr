import { useMemo, useState } from "react";
import AnalyticsOverview from "./AnalyticsOverview";
import AnalyticsProjects from "./AnalyticsProjects";
import AnalyticsAudience from "./AnalyticsAudience";
import AnalyticsEngagement from "./AnalyticsEngagement";
import AnalyticsReports from "./AnalyticsReports";

const TABS = ["Overview", "Projects", "Audience", "Engagement", "Reports"];

export default function AnalyticsDashboard({ projects = [] }) {
    const [tab, setTab] = useState("Overview");
    const [range, setRange] = useState(30);
    const [projectId, setProjectId] = useState(projects[0]?.id);

    const currentProject = useMemo(
        () => projects.find((p) => p.id === projectId) || projects[0],
        [projects, projectId]
    );

    return (
        <div className="flex flex-col gap-4">
            {/* Tabs + Filters */}
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
                    {/* Range */}
                    <select
                        className="bg-[#0b0b0d] text-white border border-white/10 rounded-xl px-3 py-1.5 text-sm"
                        value={range}
                        onChange={(e) => setRange(Number(e.target.value))}
                    >
                        <option className="text-black bg-white" value={7}>Last 7 days</option>
                        <option className="text-black bg-white" value={30}>Last 30 days</option>
                        <option className="text-black bg-white" value={90}>Last 90 days</option>
                    </select>

                    {/* Project (hide on Overview) */}
                    {tab !== "Overview" && (
                        <select
                            className="bg-[#0b0b0d] text-white border border-white/10 rounded-xl px-3 py-1.5 text-sm"
                            value={projectId}
                            onChange={(e) => setProjectId(e.target.value)}
                        >
                            {projects.map((p) => (
                                <option className="text-black bg-white" key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
            </div>

            {/* Sections */}
            {tab === "Overview" && <AnalyticsOverview range={range} />}
            {tab === "Projects" && currentProject && (
                <AnalyticsProjects range={range} projectId={currentProject.id} />
            )}
            {tab === "Audience" && (
                <AnalyticsAudience range={range} projectId={currentProject?.id} />
            )}
            {tab === "Engagement" && currentProject && (
                <AnalyticsEngagement range={range} projectId={currentProject.id} />
            )}
            {tab === "Reports" && <AnalyticsReports />}
        </div>
    );
}
