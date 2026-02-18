import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { timelineApi } from '../../services/api';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import EmptyState from '../ui/EmptyState';
import LoadingSpinner from '../ui/LoadingSpinner';

export default function TimelineWidget({ projects }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projects?.length) { setLoading(false); return; }
    Promise.all(projects.map((p) => timelineApi.list(p._id).catch(() => [])))
      .then((results) => {
        const all = results.flat().sort((a, b) => new Date(b.date) - new Date(a.date));
        setItems(all.slice(0, 5));
      })
      .finally(() => setLoading(false));
  }, [projects]);

  return (
    <Card title="Project Timeline" menu>
      {loading ? (
        <LoadingSpinner size="sm" />
      ) : items.length === 0 ? (
        <EmptyState title="No timeline items" />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item._id} className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1.5">
                <div className="h-2 w-2 rounded-full bg-[#2563EB]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[#111827] truncate">{item.title}</span>
                  <Badge label={item.type?.replace('_', ' ')} variant={item.type} />
                </div>
                <span className="text-xs text-[#9CA3AF]">{new Date(item.date).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {projects?.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[#E6EAF0]">
          <Link
            to={`/timeline?id=${projects[0]._id}`}
            className="text-xs font-semibold text-[#2563EB] hover:underline"
          >
            View all →
          </Link>
        </div>
      )}
    </Card>
  );
}
