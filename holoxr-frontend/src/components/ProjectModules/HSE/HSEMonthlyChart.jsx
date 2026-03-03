import { useMemo } from 'react';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
    CartesianGrid, Tooltip, Legend,
} from 'recharts';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const total = payload.reduce((s, p) => s + (p.value || 0), 0);
    return (
        <div className="bg-white border border-gray-100 rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.1)] p-3 text-xs">
            <p className="font-semibold text-textpri mb-1.5">{label}</p>
            {payload.map((p) => (
                <div key={p.dataKey} className="flex items-center gap-2 mb-0.5">
                    <span className="w-2 h-2 rounded-sm" style={{ background: p.fill }} />
                    <span className="text-textsec">{p.name}:</span>
                    <span className="font-semibold text-textpri">{p.value}</span>
                </div>
            ))}
            <div className="border-t border-gray-100 mt-1.5 pt-1.5 flex justify-between">
                <span className="text-textsec">Total</span>
                <span className="font-bold text-textpri">{total}</span>
            </div>
        </div>
    );
};

export default function HSEMonthlyChart({ items }) {
    const data = useMemo(() => {
        const map = {};
        (items || []).forEach((item) => {
            const d = new Date(item.date);
            const key = `${MONTH_LABELS[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;
            const ts = d.getFullYear() * 100 + d.getMonth();
            if (!map[key]) map[key] = { month: key, Critical: 0, Warning: 0, Info: 0, _ts: ts };
            map[key][item.severity] = (map[key][item.severity] || 0) + 1;
        });
        return Object.values(map).sort((a, b) => a._ts - b._ts);
    }, [items]);

    if (!data.length) return (
        <div className="flex items-center justify-center h-full text-textsec text-sm">No monthly data available</div>
    );

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 16, left: -10, bottom: 5 }} barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="Critical" stackId="a" fill="#EF4444" radius={[0, 0, 0, 0]} name="Critical" />
                <Bar dataKey="Warning" stackId="a" fill="#F59E0B" radius={[0, 0, 0, 0]} name="Warning" />
                <Bar dataKey="Info" stackId="a" fill="#3BB2A5" radius={[4, 4, 0, 0]} name="Info" />
            </BarChart>
        </ResponsiveContainer>
    );
}
