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
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
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

  const handleGenerate = async () => {
    setGenerating(true);
    setGenError('');
    try {
      const result = await scurveApi.generate(projectId);
      setData({ baseline: result.baseline || [], actual: result.actual || [] });
    } catch (err) {
      setGenError(err.message || 'Failed to generate S-Curve. Make sure schedule data is uploaded.');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const hasData = data.baseline.length > 0 || data.actual.length > 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[#111827]">S-Curve Progress</h2>

        {canEdit && (
          <div className="flex items-center gap-2">
            {/* PRIMARY: Generate from schedule */}
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="rounded-xl bg-[#2563EB] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-50 transition"
            >
              {generating ? 'Generating…' : hasData ? 'Refresh from Schedule' : 'Generate from Schedule'}
            </button>

            {/* SECONDARY: Manual edit */}
            <button
              onClick={() => { setEditing(!editing); setGenError(''); }}
              className="rounded-xl border border-[#E6EAF0] bg-white px-3 py-2 text-xs font-semibold text-[#374151] hover:bg-[#F9FAFB] transition"
            >
              {editing ? 'Cancel' : 'Edit Manually'}
            </button>
          </div>
        )}
      </div>

      {genError && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {genError}
        </div>
      )}

      {editing ? (
        <SCurveEditor data={data} onSave={handleSave} onCancel={() => setEditing(false)} />
      ) : hasData ? (
        <SCurveChart baseline={data.baseline} actual={data.actual} />
      ) : (
        <EmptyState
          title="No S-curve data"
          description='Click "Generate from Schedule" to auto-calculate progress curves from your uploaded schedule data, or use "Edit Manually" to enter data points by hand.'
        />
      )}
    </div>
  );
}

