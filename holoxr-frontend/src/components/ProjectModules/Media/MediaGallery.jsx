import { useEffect, useState, useRef } from 'react';
import { mediaApi } from '../../../services/api';
import { useRole } from '../../hooks/useRole';
import EmptyState from '../../ui/EmptyState';
import LoadingSpinner from '../../ui/LoadingSpinner';

export default function MediaGallery({ projectId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const { canUploadMedia, canEdit } = useRole();

  const load = () => {
    setLoading(true);
    mediaApi.list(projectId)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (projectId) load(); }, [projectId]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await mediaApi.upload(projectId, file);
      load();
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDelete = async (id) => {
    await mediaApi.remove(projectId, id);
    load();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[#111827]">Media Gallery</h2>
        {canUploadMedia && (
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleUpload}
              className="hidden"
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="rounded-xl border border-[#E6EAF0] bg-white px-3 py-2 text-xs font-semibold text-[#374151] hover:bg-[#F9FAFB] transition disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : '+ Upload Media'}
            </button>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState title="No media files" description="Upload images or videos to build a project gallery." />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map((item) => (
            <div key={item._id} className="group relative rounded-xl border border-[#E6EAF0] overflow-hidden bg-[#F9FAFB]">
              {item.type === 'video' ? (
                <video
                  src={item.url}
                  className="w-full h-32 object-cover"
                  muted
                  preload="metadata"
                />
              ) : (
                <img
                  src={item.thumbnail || item.url}
                  alt={item.name}
                  className="w-full h-32 object-cover"
                  loading="lazy"
                />
              )}
              <div className="px-2 py-1.5">
                <p className="text-xs text-[#374151] truncate">{item.name}</p>
                <p className="text-[10px] text-[#9CA3AF]">{item.type}</p>
              </div>
              {canEdit && (
                <button
                  onClick={() => handleDelete(item._id)}
                  className="absolute top-1 right-1 hidden group-hover:flex items-center justify-center h-6 w-6 rounded-full bg-white/90 border border-[#E6EAF0] text-[#EF4444] text-xs"
                >
                  X
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
