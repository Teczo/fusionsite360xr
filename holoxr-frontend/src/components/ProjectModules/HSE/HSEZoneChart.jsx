import { useMemo } from 'react';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
    CartesianGrid, Tooltip, Cell,
} from 'recharts';

const PALETTE = ['#EF4444', '#F59E0B', '#3BB2A5', '#6366F1', '#EC4899', '#14B8A6', '#8B5CF6'];

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-gray-100 rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.1)] p-3 text-xs">
            <p className="font-semibold text-textpri mb-1">{label || 'Unknown Zone'}</p>
            <p className="text-textsec">{payload[0].value} incident{payload[0].value !== 1 ? 's' : ''}</p>
        </div>
    );
};

export default function HSEZoneChart({ items }) {
    const data = useMemo(() => {
        const map = {};
        (items || []).forEach((item) => {
            const zone = item.zoneId || 'Unassigned';
            map[zone] = (map[zone] || 0) + 1;
        });
        return Object.entries(map)
            .map(([zone, count]) => ({ zone, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8);
    }, [items]);

    if (!data.length) return (
        <div className="flex items-center justify-center h-full text-textsec text-sm">No zone data available</div>
    );

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 16, left: 8, bottom: 5 }} barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                <YAxis type="category" dataKey="zone" tick={{ fontSize: 11, fill: '#6B7280' }} width={80} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} name="Incidents">
                    {data.map((_, i) => (
                        <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}
