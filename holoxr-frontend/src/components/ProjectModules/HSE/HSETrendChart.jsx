import { useMemo } from 'react';
import {
    ResponsiveContainer, LineChart, Line, XAxis, YAxis,
    CartesianGrid, Tooltip, Legend,
} from 'recharts';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-gray-100 rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.1)] p-3 text-xs">
            <p className="font-semibold text-textpri mb-1.5">{label}</p>
            {payload.map((p) => (
                <div key={p.dataKey} className="flex items-center gap-2 mb-0.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                    <span className="text-textsec capitalize">{p.name}:</span>
                    <span className="font-semibold text-textpri">{p.value}</span>
                </div>
            ))}
        </div>
    );
};

export default function HSETrendChart({ items }) {
    const data = useMemo(() => {
        const map = {};
        (items || []).forEach((item) => {
            const d = new Date(item.date);
            const key = `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`;
            if (!map[key]) map[key] = { month: key, Critical: 0, Warning: 0, Info: 0, _ts: d.getTime() };
            map[key][item.severity] = (map[key][item.severity] || 0) + 1;
        });
        return Object.values(map).sort((a, b) => a._ts - b._ts);
    }, [items]);

    if (!data.length) return (
        <div className="flex items-center justify-center h-full text-textsec text-sm">No trend data available</div>
    );

    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 16, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Line type="monotone" dataKey="Critical" stroke="#EF4444" strokeWidth={2} dot={{ r: 3, fill: '#EF4444' }} activeDot={{ r: 5 }} name="Critical" />
                <Line type="monotone" dataKey="Warning" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3, fill: '#F59E0B' }} activeDot={{ r: 5 }} name="Warning" />
                <Line type="monotone" dataKey="Info" stroke="#3BB2A5" strokeWidth={2} dot={{ r: 3, fill: '#3BB2A5' }} activeDot={{ r: 5 }} name="Info" />
            </LineChart>
        </ResponsiveContainer>
    );
}
