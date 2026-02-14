import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function SCurveChart({ baseline, actual, height = 250 }) {
  // Merge baseline & actual by date
  const dateMap = new Map();
  (baseline || []).forEach((p) => {
    const key = new Date(p.date).toLocaleDateString();
    dateMap.set(key, { ...dateMap.get(key), date: key, baseline: p.value });
  });
  (actual || []).forEach((p) => {
    const key = new Date(p.date).toLocaleDateString();
    dateMap.set(key, { ...dateMap.get(key), date: key, actual: p.value });
  });

  const chartData = Array.from(dateMap.values()).sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  if (chartData.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E6EAF0" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
        <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} domain={[0, 100]} />
        <Tooltip
          contentStyle={{
            background: '#fff',
            border: '1px solid #E6EAF0',
            borderRadius: '12px',
            fontSize: '12px',
          }}
        />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        <Line
          type="monotone"
          dataKey="baseline"
          stroke="#9CA3AF"
          strokeWidth={2}
          strokeDasharray="6 3"
          dot={false}
          name="Baseline"
        />
        <Line
          type="monotone"
          dataKey="actual"
          stroke="#2563EB"
          strokeWidth={2}
          dot={{ r: 3, fill: '#2563EB' }}
          name="Actual"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
