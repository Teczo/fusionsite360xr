import { useEffect, useRef, useState } from "react";
import { contractorApi } from "../../services/api";
import { useRole } from "../hooks/useRole";
import EmptyState from "../ui/EmptyState";
import LoadingSpinner from "../ui/LoadingSpinner";

export default function ContractorPerformanceCard({ projectId }) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState("");
    const fileInputRef = useRef(null);
    const { canEdit } = useRole();

    useEffect(() => {
        if (!projectId) return;
        setLoading(true);
        contractorApi.list(projectId)
            .then(setData)
            .catch(() => setData([]))
            .finally(() => setLoading(false));
    }, [projectId]);

    const handleUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';
        setUploading(true);
        setUploadError("");
        try {
            await contractorApi.upload(projectId, file);
            const updated = await contractorApi.list(projectId);
            setData(updated);
        } catch (err) {
            setUploadError(err.message || "Upload failed");
        } finally {
            setUploading(false);
        }
    };

    const handleClear = async () => {
        const confirmed = window.confirm(
            'Are you sure you want to clear all Contractor Performance data for this project? This cannot be undone.'
        );
        if (!confirmed) return;

        try {
            await contractorApi.clear(projectId);
            setData([]); // Reset local state
        } catch (err) {
            setUploadError(err.message || 'Failed to clear data');
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[#111827]">
                    Contractor Performance
                </h2>
                {canEdit && (
                    <div className="flex items-center gap-2">
                        {data.length > 0 && (
                            <button
                                onClick={handleClear}
                                className="text-sm text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition"
                                disabled={uploading}
                            >
                                Clear Data
                            </button>
                        )}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="rounded-xl border border-[#2563EB] bg-[#2563EB] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1D4ED8] transition disabled:opacity-50"
                        >
                            {uploading ? "Uploading..." : "Upload CSV"}
                        </button>
                        <input ref={fileInputRef} type="file" accept=".csv" onChange={handleUpload} className="hidden" />
                    </div>
                )}
            </div>

            {uploadError && (
                <div className="rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] px-3 py-2 mb-4 text-xs text-[#B91C1C]">
                    {uploadError}
                </div>
            )}

            {/* Content */}
            {data.length === 0 ? (
                <EmptyState
                    title="No contractor data"
                    description="Upload contractor performance CSV to see rankings."
                />
            ) : (
                <div className="overflow-auto max-h-[350px]">
                    <table className="w-full text-sm">
                        <thead className="bg-[#F9FAFB] sticky top-0">
                            <tr>
                                <th className="text-left p-2 font-medium text-[#4B5563]">Contractor</th>
                                <th className="text-right p-2 font-medium text-[#4B5563]">Activities</th>
                                <th className="text-right p-2 font-medium text-[#4B5563]">Delayed</th>
                                <th className="text-right p-2 font-medium text-[#4B5563]">Delay Days</th>
                                <th className="text-right p-2 font-medium text-[#4B5563]">Incidents</th>
                                <th className="text-right p-2 font-medium text-[#4B5563]">Rework</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data
                                .sort((a, b) => (b.totalDelayDays || 0) - (a.totalDelayDays || 0))
                                .map((c, i) => (
                                    <tr key={i} className="border-t border-[#E6EAF0]">
                                        <td className="p-2 font-medium text-[#111827]">{c.contractorName}</td>
                                        <td className="p-2 text-right text-[#4B5563]">{c.totalActivities}</td>
                                        <td className="p-2 text-right text-[#DC2626] font-medium">{c.delayedActivities}</td>
                                        <td className="p-2 text-right text-[#4B5563]">{c.totalDelayDays}</td>
                                        <td className="p-2 text-right text-[#4B5563]">{c.incidents}</td>
                                        <td className="p-2 text-right text-[#4B5563]">{c.reworkCount}</td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
