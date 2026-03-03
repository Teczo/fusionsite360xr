import { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

const COLORS = { Critical: '#EF4444', Warning: '#F59E0B', Info: '#3BB2A5' };

const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const { name, value } = payload[0];
    return (
        <div className="bg-white border border-gray-100 rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.1)] p-3 text-xs">
            <p className="font-semibold text-textpri">{name}</p>
            <p className="text-textsec mt-0.5">{value} incident{value !== 1 ? 's' : ''}</p>
        </div>
    );
};

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const r = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + r * Math.cos(-midAngle * RADIAN);
    const y = cy + r * Math.sin(-midAngle * RADIAN);
    return (
        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

export default function HSESeverityChart({ items }) {
    const data = useMemo(() => {
        const counts = { Critical: 0, Warning: 0, Info: 0 };
        (items || []).forEach((i) => { if (counts[i.severity] !== undefined) counts[i.severity]++; });
        return Object.entries(counts)
            .filter(([, v]) => v > 0)
            .map(([name, value]) => ({ name, value }));
    }, [items]);

    if (!data.length) return (
        <div className="flex items-center justify-center h-full text-textsec text-sm">No data available</div>
    );

    return (
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="45%"
                    innerRadius="40%"
                    outerRadius="65%"
                    paddingAngle={3}
                    dataKey="value"
                    labelLine={false}
                    label={renderCustomLabel}
                >
                    {data.map((entry) => (
                        <Cell key={entry.name} fill={COLORS[entry.name] || '#9CA3AF'} />
                    ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                    formatter={(value, entry) => (
                        <span style={{ color: '#374151' }}>{value} ({entry.payload.value})</span>
                    )}
                />
            </PieChart>
        </ResponsiveContainer>
    );
}
