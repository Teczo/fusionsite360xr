import { useEffect, useState } from 'react';
import { scurveApi } from '../../../services/api';
import { useRole } from '../../hooks/useRole';
import EmptyState from '../../ui/EmptyState';
import LoadingSpinner from '../../ui/LoadingSpinner';
import SCurveChart from './SCurveChart';
import SCurveEditor from './SCurveEditor';

export default function SCurvePanel({ projectId }) {
  const [data, setData] = useState({ baseline: [], actual: [] });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const { canEdit } = useRole();

  const load = () => {
    setLoading(true);
    scurveApi.get(projectId)
      .then((d) => setData({ baseline: d.baseline || [], actual: d.actual || [] }))
      .catch(() => setData({ baseline: [], actual: [] }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (projectId) load(); }, [projectId]);

  const handleSave = async (updated) => {
    await scurveApi.update(projectId, updated);
    setEditing(false);
    load();
  };

  if (loading) return <LoadingSpinner />;

  const hasData = data.baseline.length > 0 || data.actual.length > 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-textpri" style={{ fontFamily: "'Syne', 'Inter', sans-serif" }}>S-Curve Progress</h2>
        {canEdit && (
          <button
            onClick={() => setEditing(!editing)}
            className="rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-textpri hover:bg-appbg transition"
          >
            {editing ? 'Cancel' : 'Edit Data'}
          </button>
        )}
      </div>

      {editing ? (
        <SCurveEditor data={data} onSave={handleSave} onCancel={() => setEditing(false)} />
      ) : hasData ? (
        <SCurveChart baseline={data.baseline} actual={data.actual} />
      ) : (
        <EmptyState title="No S-curve data" description="Add baseline and actual progress data to see the S-curve chart." />
      )}
    </div>
  );
}
