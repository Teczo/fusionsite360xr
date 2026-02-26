import { useMemo, useState } from "react";
import { LayoutDashboard, FolderKanban, Users, BarChart3, FileText } from "lucide-react";
import AnalyticsOverview from "./AnalyticsOverview";
import AnalyticsProjects from "./AnalyticsProjects";
import AnalyticsAudience from "./AnalyticsAudience";
import AnalyticsEngagement from "./AnalyticsEngagement";
import AnalyticsReports from "./AnalyticsReports";

const TABS = [
    { id: "Overview",   label: "Overview",   icon: LayoutDashboard },
    { id: "Projects",   label: "Projects",   icon: FolderKanban },
    { id: "Audience",   label: "Audience",   icon: Users },
    { id: "Engagement", label: "Engagement", icon: BarChart3 },
    { id: "Reports",    label: "Reports",    icon: FileText },
];

const RANGES = [
    { value: 7,  label: "Last 7 days" },
    { value: 30, label: "Last 30 days" },
    { value: 90, label: "Last 90 days" },
];

export default function AnalyticsDashboard({ projects = [] }) {
    const [tab, setTab] = useState("Overview");
    const [range, setRange] = useState(30);
    const [projectId, setProjectId] = useState(projects[0]?.id);

    const currentProject = useMemo(
        () => projects.find((p) => p.id === projectId) || projects[0],
        [projects, projectId]
    );

    return (
        <div className="flex flex-col gap-0">
            {/* Tab bar */}
            <div className="border-b border-border">
                <div className="flex gap-0">
                    {TABS.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => setTab(id)}
                            className={
                                "flex items-center gap-2 px-5 py-3 font-medium text-sm transition-all border-b-2 " +
                                (tab === id
                                    ? "border-[#2C97D4] text-[#2C97D4] bg-[#2C97D4]/5"
                                    : "border-transparent text-textsec hover:text-textpri hover:bg-appbg")
                            }
                        >
                            <Icon size={16} />
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Filters row — below tabs, right-aligned */}
            <div className="flex items-center justify-end gap-2 py-3">
                {projects.length > 0 && (
                    <select
                        className="border border-[#2C97D4] rounded-lg px-3 py-1.5 text-sm font-medium text-[#2C97D4] bg-surface focus:outline-none focus:ring-2 focus:ring-[#2C97D4]/20 transition-all"
                        value={projectId}
                        onChange={(e) => setProjectId(e.target.value)}
                    >
                        {projects.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                )}
                <div className="flex items-center gap-1">
                    {RANGES.map((r) => (
                        <button
                            key={r.value}
                            onClick={() => setRange(r.value)}
                            className={
                                "px-3 py-1.5 rounded-lg text-sm font-medium transition-all " +
                                (range === r.value
                                    ? "bg-[#2C97D4] text-white shadow-sm"
                                    : "border border-border text-textsec hover:border-[#2C97D4] bg-surface")
                            }
                        >
                            {r.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab content */}
            <div className="flex flex-col gap-5 mt-1">
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
        </div>
    );
}
