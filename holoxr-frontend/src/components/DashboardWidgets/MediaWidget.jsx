import { useEffect, useState } from 'react';
import { mediaApi } from '../../services/api';
import Card from '../ui/Card';
import EmptyState from '../ui/EmptyState';
import LoadingSpinner from '../ui/LoadingSpinner';

export default function MediaWidget({ projects }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projects?.length) { setLoading(false); return; }
    Promise.all(projects.map((p) => mediaApi.list(p._id).catch(() => [])))
      .then((results) => {
        const all = results.flat().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setItems(all.slice(0, 6));
      })
      .finally(() => setLoading(false));
  }, [projects]);

  return (
    <Card title="Recent Media" menu>
      {loading ? (
        <LoadingSpinner size="sm" />
      ) : items.length === 0 ? (
        <EmptyState title="No media files" />
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {items.map((item) => (
            <div key={item._id} className="rounded-lg border border-border overflow-hidden">
              {item.type === 'video' ? (
                <video src={item.url} className="w-full h-16 object-cover" muted preload="metadata" />
              ) : (
                <img src={item.thumbnail || item.url} alt={item.name} className="w-full h-16 object-cover" loading="lazy" />
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
