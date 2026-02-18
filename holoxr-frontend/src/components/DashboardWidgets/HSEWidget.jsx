import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { hseApi } from '../../services/api';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import EmptyState from '../ui/EmptyState';
import LoadingSpinner from '../ui/LoadingSpinner';

export default function HSEWidget({ projects }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projects?.length) { setLoading(false); return; }
    Promise.all(projects.map((p) => hseApi.list(p._id).catch(() => [])))
      .then((results) => {
        const all = results.flat()
          .filter((i) => i.severity === 'Critical' || i.severity === 'Warning')
          .sort((a, b) => new Date(b.date) - new Date(a.date));
        setItems(all.slice(0, 5));
      })
      .finally(() => setLoading(false));
  }, [projects]);

  return (
    <Card title="HSE Overview" menu>
      {loading ? (
        <LoadingSpinner size="sm" />
      ) : items.length === 0 ? (
        <EmptyState title="No active incidents" />
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item._id} className="flex items-center gap-3 rounded-xl border border-[#E6EAF0] bg-[#F9FAFB] px-3 py-2">
              <Badge label={item.severity} variant={item.severity} />
              <div className="min-w-0 flex-1">
                <span className="text-sm text-[#111827]">{item.title}</span>
                <div className="text-xs text-[#9CA3AF]">{new Date(item.date).toLocaleDateString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {projects?.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[#E6EAF0]">
          <Link
            to={`/hse?id=${projects[0]._id}`}
            className="text-xs font-semibold text-[#2563EB] hover:underline"
          >
            View all →
          </Link>
        </div>
      )}
    </Card>
  );
}
