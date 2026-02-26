import { useEffect, useState } from 'react';
import { alertsApi } from '../../services/api';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import EmptyState from '../ui/EmptyState';
import LoadingSpinner from '../ui/LoadingSpinner';

export default function AlertsWidget({ projects }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projects?.length) { setLoading(false); return; }
    Promise.all(projects.map((p) => alertsApi.list(p._id).catch(() => [])))
      .then((results) => {
        const all = results.flat().sort((a, b) => new Date(b.date) - new Date(a.date));
        setItems(all.slice(0, 5));
      })
      .finally(() => setLoading(false));
  }, [projects]);

  return (
    <Card title="Alerts Overview" menu>
      {loading ? (
        <LoadingSpinner size="sm" />
      ) : items.length === 0 ? (
        <EmptyState title="No alerts" />
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item._id} className="flex items-center gap-3 rounded-xl border border-border bg-appbg px-3 py-2">
              <Badge label={item.severity} variant={item.severity} />
              <div className="min-w-0 flex-1">
                <span className="text-sm text-textpri">{item.title}</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-texttert">{new Date(item.date).toLocaleDateString()}</span>
                  <span className="text-xs text-borderlight">|</span>
                  <span className="text-xs text-texttert">{item.source}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
