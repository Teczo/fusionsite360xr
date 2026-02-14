import { useEffect, useState } from 'react';
import { scurveApi } from '../../services/api';
import Card from '../ui/Card';
import EmptyState from '../ui/EmptyState';
import LoadingSpinner from '../ui/LoadingSpinner';
import SCurveChart from '../ProjectModules/SCurve/SCurveChart';

export default function SCurveWidget({ projects }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projects?.length) { setLoading(false); return; }
    // Show the first project's s-curve that has data
    (async () => {
      for (const p of projects) {
        try {
          const d = await scurveApi.get(p._id);
          if (d.baseline?.length > 0 || d.actual?.length > 0) {
            setData(d);
            break;
          }
        } catch { /* skip */ }
      }
      setLoading(false);
    })();
  }, [projects]);

  return (
    <Card title="S-Curve Progress" menu>
      {loading ? (
        <LoadingSpinner size="sm" />
      ) : !data ? (
        <EmptyState title="No progress data" />
      ) : (
        <SCurveChart baseline={data.baseline} actual={data.actual} height={200} />
      )}
    </Card>
  );
}
