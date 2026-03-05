import { useMemo } from 'react';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
    CartesianGrid, Tooltip, Legend, ReferenceLine,
} from 'recharts';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Stacked by severity — shows both volume AND severity escalation over time
const STACKS = [
    { key: 'Critical', color: '#EF4444' },
    { key: 'Warning',  color: '#F59E0B' },
    { key: 'Info',     color: '#3BB2A5' },
];

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const total = payload.reduce((s, p) => s + (p.value || 0), 0);
    return (
        <div className="bg-white border border-gray-100 rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.1)] p-3 text-xs min-w-[160px]">
            <p className="font-semibold text-[#111827] mb-2">{label}</p>
            {[...payload].reverse().map((p) => p.value > 0 && (
                <div key={p.dataKey} className="flex items-center justify-between gap-4 mb-0.5">
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.fill }} />
                        <span className="text-[#6B7280]">{p.name}</span>
                    </div>
                    <span className="font-bold text-[#111827]">{p.value}</span>
                </div>
            ))}
            <div className="border-t border-gray-100 mt-1.5 pt-1.5 flex items-center justify-between">
                <span className="text-[#9CA3AF]">Total</span>
                <span className="font-black text-[#111827]">{total}</span>
            </div>
        </div>
    );
};

export default function HSETrendChart({ items, period = 'YTD' }) {
    const { data, avgLine } = useMemo(() => {
        const now = new Date();
        const y = now.getFullYear(), m = now.getMonth();

        const filtered = (items || []).filter((item) => {
            const d = new Date(item.date);
            if (period === 'MTD') return d.getFullYear() === y && d.getMonth() === m;
            return d.getFullYear() === y;
        });

        const map = {};
        filtered.forEach((item) => {
            const d = new Date(item.date);
            const key = `${MONTH_LABELS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
            const ts  = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
            if (!map[key]) map[key] = { month: key, _ts: ts, Critical: 0, Warning: 0, Info: 0 };
            const sev = item.severity;
            if (map[key][sev] !== undefined) map[key][sev]++;
        });

        const sorted = Object.values(map).sort((a, b) => a._ts - b._ts);

        // Rolling 3-month average of totals (for reference line concept — we expose as data prop)
        const avgLine = sorted.length >= 2
            ? Math.round(sorted.reduce((s, r) => s + r.Critical + r.Warning + r.Info, 0) / sorted.length * 10) / 10
            : null;

        return { data: sorted, avgLine };
    }, [items, period]);

    if (!data.length) return (
        <div className="flex items-center justify-center h-full text-[#9CA3AF] text-sm">
            No trend data for this period
        </div>
    );

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 16, left: -10, bottom: 5 }} barSize={22}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '10px', paddingTop: '6px' }}
                    formatter={(v) => <span style={{ color: '#6B7280' }}>{v}</span>}
                />
                {avgLine !== null && (
                    <ReferenceLine y={avgLine} stroke="#9CA3AF" strokeDasharray="4 3" strokeWidth={1.5}
                        label={{ value: `Avg ${avgLine}`, position: 'insideTopRight', fontSize: 9, fill: '#9CA3AF' }} />
                )}
                {STACKS.map(({ key, color }) => (
                    <Bar key={key} dataKey={key} stackId="sev" fill={color} name={key}
                        radius={key === 'Critical' ? [3, 3, 0, 0] : [0, 0, 0, 0]} />
                ))}
            </BarChart>
        </ResponsiveContainer>
    );
}
