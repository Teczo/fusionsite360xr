import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Search, Bell, Share, Plus, Menu } from "lucide-react";

const routeMap = {
    "/": "Workspace",
    "/dashboard": "Dashboard",
    "/digital-twin": "Digital Twin",
    "/twin": "Digital Twin",
    "/timeline": "Timeline",
    "/hse": "HSE",
    "/files": "Files",
    "/ai": "AI Assistant",
    "/ai-settings": "AI Settings",
};

export default function DashboardHeader({
    searchQuery,
    setSearchQuery,
    user,
    setActiveView,
    setShowModal,
    onToggleSidebar,
}) {
    const [timeRange, setTimeRange] = useState("7d");
    const location = useLocation();

    const generateBreadcrumb = () => {
        const pathSegments = location.pathname.split("/").filter(Boolean);

        if (pathSegments.length === 0) {
            return ["Workspace"];
        }

        const breadcrumb = ["Workspace"];

        pathSegments.forEach((segment) => {
            const key = "/" + segment;
            if (routeMap[key]) {
                breadcrumb.push(routeMap[key]);
            }
        });

        return breadcrumb;
    };

    return (
        <header className="w-full bg-white border-b border-gray-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)] shrink-0">

            {/* Top row: breadcrumb + controls */}
            <div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-4">
                {/* Left: Toggle + Breadcrumb */}
                <div className="flex items-center gap-3 min-w-0">
                    {/* Sidebar toggle — visible on tablet & mobile only */}
                    {onToggleSidebar && (
                        <button
                            onClick={onToggleSidebar}
                            className="lg:hidden p-2 -ml-2 rounded-xl text-textsec hover:text-textpri hover:bg-gray-100 transition-colors"
                            aria-label="Toggle sidebar"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                    )}

                    <nav className="flex items-center gap-1.5 text-sm">
                        {generateBreadcrumb().map((item, index) => (
                            <span key={index} className="flex items-center gap-1.5">
                                {index > 0 && <span className="text-textsec/50">/</span>}
                                <span className={`font-medium ${index === generateBreadcrumb().length - 1 ? "text-textpri" : "text-textsec"}`}>{item}</span>
                            </span>
                        ))}
                    </nav>
                </div>

                {/* Right: controls */}
                <div className="flex items-center gap-2.5 shrink-0">


                    {/* Notification bell */}
                    <button
                        className="p-2 rounded-xl text-textsec hover:text-textpri hover:bg-gray-100 transition-colors relative"
                        title="Notifications"
                    >
                        <Bell className="w-[18px] h-[18px]" />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full" />
                    </button>



                    {/* Divider */}
                    <div className="w-px h-6 bg-gray-200 hidden sm:block" />

                    {/* Filter */}
                    <button
                        className="p-2 rounded-xl text-textsec hover:text-textpri hover:bg-gray-100 transition-colors"
                        title="Filters"
                    >
                        <Share className="w-[18px] h-[18px]" />
                    </button>


                </div>
            </div>
        </header>
    );
}
