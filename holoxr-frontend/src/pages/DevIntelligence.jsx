// DevIntelligence.jsx
// TEMPORARY DEBUG PAGE — Intelligence Console (Safe Dev Mode)
// Accessible at /dev/intelligence (direct URL only, not in navigation).
// Remove this file and the matching route in App.jsx to strip the feature.

import { useState } from 'react';

const API = import.meta.env.VITE_API_URL ?? '';

// ─── helpers ──────────────────────────────────────────────────────────────────

function SectionCard({ title, children }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <h2 className="text-base font-semibold text-gray-800 mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Label({ children }) {
  return <label className="block text-sm font-medium text-gray-600 mb-1">{children}</label>;
}

function Input({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
    />
  );
}

function Button({ onClick, disabled, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
      {message}
    </div>
  );
}

// ─── Section 1: Cascading Delay Simulation ────────────────────────────────────

function SimulateDelaySection() {
  const [projectId, setProjectId] = useState('');
  const [activityId, setActivityId] = useState('');
  const [delayDays, setDelayDays] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function handleSimulate() {
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/dev/intelligence/simulate-delay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, activityId, delayDays: Number(delayDays) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function delayColor(days) {
    return days >= 5 ? 'text-red-500 font-semibold' : 'text-yellow-500 font-semibold';
  }

  function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  return (
    <SectionCard title="1 — Cascading Delay Simulation">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div>
          <Label>Project ID</Label>
          <Input value={projectId} onChange={e => setProjectId(e.target.value)} placeholder="MongoDB ObjectId" />
        </div>
        <div>
          <Label>Activity ID</Label>
          <Input value={activityId} onChange={e => setActivityId(e.target.value)} placeholder="Activity string ID" />
        </div>
        <div>
          <Label>Delay Days</Label>
          <Input type="number" value={delayDays} onChange={e => setDelayDays(e.target.value)} placeholder="0" />
        </div>
      </div>

      <Button onClick={handleSimulate} disabled={loading || !projectId || !activityId}>
        {loading ? 'Simulating…' : 'Simulate'}
      </Button>

      <ErrorBanner message={error} />

      {result && (
        <div className="mt-5">
          <p className="text-sm text-gray-700 mb-3 font-medium">
            Total Project Delay:{' '}
            <span className={delayColor(result.totalProjectDelay)}>
              {result.totalProjectDelay} days
            </span>
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-3 py-2 border border-gray-200">Activity</th>
                  <th className="px-3 py-2 border border-gray-200">Original Finish</th>
                  <th className="px-3 py-2 border border-gray-200">New Finish</th>
                  <th className="px-3 py-2 border border-gray-200">Propagated Delay</th>
                </tr>
              </thead>
              <tbody>
                {result.impactedActivities.map((a, i) => (
                  <tr key={i} className="odd:bg-white even:bg-gray-50">
                    <td className="px-3 py-2 border border-gray-200 font-mono text-xs text-gray-700">{a.activityId}</td>
                    <td className="px-3 py-2 border border-gray-200 text-gray-600">{formatDate(a.originalFinish)}</td>
                    <td className="px-3 py-2 border border-gray-200 text-gray-600">{formatDate(a.newFinish)}</td>
                    <td className={`px-3 py-2 border border-gray-200 ${delayColor(a.propagatedDelay)}`}>
                      {a.propagatedDelay} days
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {result.impactedActivities.length === 0 && (
            <p className="mt-2 text-sm text-gray-500">No activities impacted.</p>
          )}
        </div>
      )}
    </SectionCard>
  );
}

// ─── Section 2: Overdue Activities ───────────────────────────────────────────

function OverdueSection() {
  const [projectId, setProjectId] = useState('');
  const [loading, setLoading] = useState(false);
  const [activities, setActivities] = useState(null);
  const [error, setError] = useState('');

  async function handleLoad() {
    setError('');
    setActivities(null);
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/dev/intelligence/overdue/${encodeURIComponent(projectId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      setActivities(Array.isArray(data) ? data : data.activities ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SectionCard title="2 — Overdue Activities">
      <div className="flex gap-3 items-end mb-4">
        <div className="flex-1">
          <Label>Project ID</Label>
          <Input value={projectId} onChange={e => setProjectId(e.target.value)} placeholder="MongoDB ObjectId" />
        </div>
        <Button onClick={handleLoad} disabled={loading || !projectId}>
          {loading ? 'Loading…' : 'Load Overdue'}
        </Button>
      </div>

      <ErrorBanner message={error} />

      {activities !== null && (
        activities.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">No overdue activities found.</p>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-3 py-2 border border-gray-200">Activity ID</th>
                  <th className="px-3 py-2 border border-gray-200">Name</th>
                  <th className="px-3 py-2 border border-gray-200">Planned Finish</th>
                  <th className="px-3 py-2 border border-gray-200">Status</th>
                  <th className="px-3 py-2 border border-gray-200">Delay (days)</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((a, i) => (
                  <tr key={i} className="odd:bg-white even:bg-gray-50">
                    <td className="px-3 py-2 border border-gray-200 font-mono text-xs text-gray-700">
                      {a.activityId ?? a._id}
                    </td>
                    <td className="px-3 py-2 border border-gray-200 text-gray-700">{a.name ?? '—'}</td>
                    <td className="px-3 py-2 border border-gray-200 text-gray-600">
                      {a.plannedFinish ? new Date(a.plannedFinish).toLocaleDateString('en-GB') : '—'}
                    </td>
                    <td className="px-3 py-2 border border-gray-200 text-gray-600">{a.status ?? '—'}</td>
                    <td className="px-3 py-2 border border-gray-200 text-red-500 font-semibold">
                      {a.delayDays ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </SectionCard>
  );
}

// ─── Section 3: Portfolio Drivers ────────────────────────────────────────────

function PortfolioDriversSection() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  async function handleLoad() {
    setError('');
    setData(null);
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/dev/intelligence/portfolio-drivers`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Request failed');
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SectionCard title="3 — Portfolio Delay Drivers">
      <Button onClick={handleLoad} disabled={loading}>
        {loading ? 'Loading…' : 'Load Portfolio Drivers'}
      </Button>

      <ErrorBanner message={error} />

      {data && (
        <div className="mt-4 space-y-3">
          <div className="flex gap-6">
            <div className="bg-gray-50 rounded-lg px-4 py-3 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Completed Projects</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{data.completedProjectCount}</p>
            </div>
            <div className="bg-gray-50 rounded-lg px-4 py-3 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Avg Delay %</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">
                {typeof data.avgDelayPercent === 'number' ? data.avgDelayPercent.toFixed(1) : '—'}%
              </p>
            </div>
          </div>

          {data.topRiskFactors && data.topRiskFactors.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Top Risk Factors</p>
              <ul className="space-y-1">
                {data.topRiskFactors.map((f, i) => (
                  <li key={i} className="flex justify-between text-sm bg-gray-50 rounded px-3 py-2">
                    <span className="text-gray-700">{f.factor}</span>
                    <span className="text-gray-500 font-medium">{f.frequency}×</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(!data.topRiskFactors || data.topRiskFactors.length === 0) && (
            <p className="text-sm text-gray-500">No risk factor data available (schema fields not yet populated).</p>
          )}
        </div>
      )}
    </SectionCard>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DevIntelligence() {
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="mb-2">
          <span className="inline-block bg-yellow-100 text-yellow-800 text-xs font-semibold px-2.5 py-1 rounded-full border border-yellow-300 mb-3">
            DEV MODE — not visible in production
          </span>
          <h1 className="text-2xl font-bold text-gray-900">Intelligence Debug Console</h1>
          <p className="text-sm text-gray-500 mt-1">
            Direct access to intelligence services. No auth required. Available only when{' '}
            <code className="bg-gray-200 rounded px-1 text-xs">NODE_ENV !== production</code>.
          </p>
        </div>

        <SimulateDelaySection />
        <OverdueSection />
        <PortfolioDriversSection />
      </div>
    </div>
  );
}
