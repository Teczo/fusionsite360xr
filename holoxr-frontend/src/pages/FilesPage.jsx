import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search, Upload, Download, Box, Image as ImageIcon, FileText,
  Building2, Calendar, AlertTriangle, Package, Film,
} from 'lucide-react';
import { mediaApi, timelineApi, hseApi } from '../services/api';
import Badge from '../components/ui/Badge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import LibraryModal from '../components/modals/LibraryModal';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'all',   label: 'All' },
  { key: 'bim',   label: 'BIM Assets (Global)' },
  { key: 'media', label: 'Media (Project)' },
  { key: 'data',  label: 'Data Files (Project)' },
];

const BIM_TYPE_ICON = {
  model:  <Box size={22} className="text-blue-400" />,
  ifc:    <Building2 size={22} className="text-emerald-400" />,
  image:  <ImageIcon size={22} className="text-purple-400" />,
  text:   <FileText size={22} className="text-amber-400" />,
  video:  <Film size={22} className="text-pink-400" />,
};

const BIM_TYPE_LABEL = {
  model: '3D Model', ifc: 'IFC', image: 'Image',
  text: 'Text', ui: 'UI', qrcode: 'QR Code',
};

// ─── Shared helpers ───────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle, badge, action }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-lg font-semibold text-[#111827]">{title}</h2>
          {badge && (
            <span className="inline-flex items-center rounded-full bg-[#EFF6FF] text-[#2563EB] text-[11px] font-medium px-2 py-0.5 border border-[#BFDBFE]">
              {badge}
            </span>
          )}
        </div>
        {subtitle && <p className="text-sm text-[#6B7280] mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function UploadButton({ label, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
    >
      <Upload size={14} />
      {label}
    </button>
  );
}

// ─── BIM Assets section ───────────────────────────────────────────────────────

function BimCard({ item }) {
  const date = item.createdAt
    ? formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })
    : null;

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white overflow-hidden hover:shadow-md transition-shadow group">
      {/* Thumbnail */}
      <div className="relative h-28 bg-[#F9FAFB] flex items-center justify-center overflow-hidden">
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt={item.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="text-[#D1D5DB]">
            {BIM_TYPE_ICON[item.type] || <Package size={22} className="text-[#9CA3AF]" />}
          </div>
        )}
        {item.url && (
          <a
            href={item.url}
            download
            target="_blank"
            rel="noreferrer"
            onClick={e => e.stopPropagation()}
            title="Download"
            className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Download size={18} className="text-white" />
          </a>
        )}
      </div>
      {/* Info */}
      <div className="p-2.5">
        <p className="text-xs font-medium text-[#111827] truncate" title={item.name}>
          {item.name}
        </p>
        <div className="flex items-center justify-between mt-1.5 gap-1">
          <span className="text-[10px] text-[#6B7280] bg-[#F3F4F6] rounded px-1.5 py-0.5 truncate">
            {BIM_TYPE_LABEL[item.type] || item.type}
          </span>
          {date && (
            <span className="text-[10px] text-[#9CA3AF] shrink-0">{date}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function BimSection({ items, loading, onOpenLibrary }) {
  return (
    <section>
      <SectionHeader
        title="BIM Asset Library"
        subtitle="Global 3D models, IFC files, images, and UI elements"
        badge="Global"
        action={<UploadButton label="Upload Asset" onClick={onOpenLibrary} />}
      />
      {loading ? (
        <LoadingSpinner size="sm" />
      ) : items.length === 0 ? (
        <EmptyState
          title="No BIM assets found"
          description="Upload 3D models, IFC files, or images to the global library"
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {items.map(item => (
            <BimCard key={item._id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Media section ────────────────────────────────────────────────────────────

function MediaCard({ item }) {
  const date = item.createdAt
    ? formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })
    : null;

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white overflow-hidden hover:shadow-md transition-shadow group">
      <div className="relative h-28 bg-[#F9FAFB] flex items-center justify-center overflow-hidden">
        {item.type === 'video' ? (
          <video
            src={item.url}
            className="w-full h-full object-cover"
            muted
            preload="metadata"
          />
        ) : (
          <img
            src={item.thumbnail || item.url}
            alt={item.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        )}
        {item.url && (
          <a
            href={item.url}
            download
            target="_blank"
            rel="noreferrer"
            title="Download"
            className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Download size={18} className="text-white" />
          </a>
        )}
      </div>
      <div className="p-2.5">
        <p className="text-xs font-medium text-[#111827] truncate" title={item.name}>
          {item.name}
        </p>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] text-[#6B7280] bg-[#F3F4F6] rounded px-1.5 py-0.5 capitalize">
            {item.type || 'file'}
          </span>
          {date && <span className="text-[10px] text-[#9CA3AF]">{date}</span>}
        </div>
      </div>
    </div>
  );
}

function MediaSection({ items, loading, projectId, onUploadClick }) {
  return (
    <section>
      <SectionHeader
        title="Media"
        subtitle="Project images and videos"
        badge="Project"
        action={
          <UploadButton
            label="Upload Media"
            onClick={onUploadClick}
            disabled={!projectId}
          />
        }
      />
      {!projectId ? (
        <EmptyState
          title="No project selected"
          description="Add ?id=PROJECT_ID to the URL to load project media"
        />
      ) : loading ? (
        <LoadingSpinner size="sm" />
      ) : items.length === 0 ? (
        <EmptyState
          title="No media files"
          description="Upload images or videos to this project"
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {items.map(item => (
            <MediaCard key={item._id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Data Files section ───────────────────────────────────────────────────────

function TimelineList({ items, projectId }) {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar size={15} className="text-[#2563EB]" />
          <h3 className="text-sm font-semibold text-[#111827]">Timeline</h3>
          <span className="text-xs text-[#9CA3AF]">({items.length})</span>
        </div>
        <a
          href={`/timeline${projectId ? `?id=${projectId}` : ''}`}
          className="text-xs text-[#2563EB] hover:underline font-medium"
        >
          Manage →
        </a>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No timeline events"
          description="Add events on the Timeline page"
        />
      ) : (
        <div className="divide-y divide-[#F3F4F6]">
          {items.slice(0, 10).map(item => (
            <div key={item._id} className="flex items-center gap-3 py-2.5">
              <div className="h-2 w-2 rounded-full bg-[#2563EB] shrink-0" />
              <p className="text-sm text-[#111827] truncate flex-1">{item.title}</p>
              <Badge label={item.type?.replace('_', ' ')} variant={item.type} />
              <span className="text-xs text-[#9CA3AF] shrink-0">
                {item.date ? new Date(item.date).toLocaleDateString() : ''}
              </span>
            </div>
          ))}
          {items.length > 10 && (
            <p className="text-xs text-[#9CA3AF] pt-2 text-center">
              +{items.length - 10} more — manage on Timeline page
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function HseList({ items, projectId, onImport }) {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={15} className="text-[#F59E0B]" />
          <h3 className="text-sm font-semibold text-[#111827]">HSE Records</h3>
          <span className="text-xs text-[#9CA3AF]">({items.length})</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onImport}
            className="inline-flex items-center gap-1 text-xs text-[#2563EB] hover:underline font-medium"
          >
            <Upload size={11} />
            Import CSV
          </button>
          <a
            href={`/hse${projectId ? `?id=${projectId}` : ''}`}
            className="text-xs text-[#2563EB] hover:underline font-medium"
          >
            Manage →
          </a>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No HSE records"
          description="Import a CSV file or add records on the HSE page"
        />
      ) : (
        <div className="divide-y divide-[#F3F4F6]">
          {items.slice(0, 10).map(item => (
            <div key={item._id} className="flex items-center gap-3 py-2.5">
              <p className="text-sm text-[#111827] truncate flex-1">{item.title}</p>
              <Badge label={item.severity} variant={item.severity} />
              <span className="text-xs text-[#9CA3AF] shrink-0">
                {item.date ? new Date(item.date).toLocaleDateString() : ''}
              </span>
            </div>
          ))}
          {items.length > 10 && (
            <p className="text-xs text-[#9CA3AF] pt-2 text-center">
              +{items.length - 10} more — manage on HSE page
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function DataSection({ timelineItems, hseItems, loading, projectId, onHseImport }) {
  return (
    <section>
      <SectionHeader
        title="Data Files"
        subtitle="Timeline events and HSE records imported from CSV"
        badge="Project"
      />
      {!projectId ? (
        <EmptyState
          title="No project selected"
          description="Add ?id=PROJECT_ID to the URL to load project data"
        />
      ) : loading ? (
        <LoadingSpinner size="sm" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TimelineList items={timelineItems} projectId={projectId} />
          <HseList items={hseItems} projectId={projectId} onImport={onHseImport} />
        </div>
      )}
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FilesPage() {
  const [params] = useSearchParams();
  const projectId = params.get('id');

  const [activeTab, setActiveTab]   = useState('all');
  const [search, setSearch]         = useState('');
  const [showLibrary, setShowLibrary] = useState(false);

  // BIM assets — global
  const [bimItems, setBimItems]       = useState([]);
  const [bimLoading, setBimLoading]   = useState(true);

  // Media — project-scoped
  const [mediaItems, setMediaItems]     = useState([]);
  const [mediaLoading, setMediaLoading] = useState(true);

  // Timeline — project-scoped
  const [timelineItems, setTimelineItems]     = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(true);

  // HSE — project-scoped
  const [hseItems, setHseItems]     = useState([]);
  const [hseLoading, setHseLoading] = useState(true);

  // Hidden file inputs
  const mediaInputRef = useRef(null);
  const hseInputRef   = useRef(null);

  // ── Fetchers ──────────────────────────────────────────────────────────────

  const fetchBimItems = useCallback(async () => {
    setBimLoading(true);
    try {
      const res  = await fetch(`${import.meta.env.VITE_API_URL}/api/files`);
      const data = await res.json();
      setBimItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch BIM assets:', err);
      setBimItems([]);
    } finally {
      setBimLoading(false);
    }
  }, []);

  const fetchMedia = useCallback(async () => {
    if (!projectId) { setMediaLoading(false); return; }
    setMediaLoading(true);
    try {
      const data = await mediaApi.list(projectId);
      setMediaItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch media:', err);
      setMediaItems([]);
    } finally {
      setMediaLoading(false);
    }
  }, [projectId]);

  const fetchTimeline = useCallback(async () => {
    if (!projectId) { setTimelineLoading(false); return; }
    setTimelineLoading(true);
    try {
      const data = await timelineApi.list(projectId);
      setTimelineItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch timeline:', err);
      setTimelineItems([]);
    } finally {
      setTimelineLoading(false);
    }
  }, [projectId]);

  const fetchHse = useCallback(async () => {
    if (!projectId) { setHseLoading(false); return; }
    setHseLoading(true);
    try {
      const data = await hseApi.list(projectId);
      setHseItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch HSE:', err);
      setHseItems([]);
    } finally {
      setHseLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchBimItems();
    fetchMedia();
    fetchTimeline();
    fetchHse();
  }, [fetchBimItems, fetchMedia, fetchTimeline, fetchHse]);

  // ── Upload handlers ───────────────────────────────────────────────────────

  const handleMediaUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !projectId) return;
    try {
      await mediaApi.upload(projectId, file);
      toast.success('Media uploaded');
      fetchMedia();
    } catch {
      toast.error('Media upload failed');
    } finally {
      e.target.value = '';
    }
  };

  const handleHseImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !projectId) return;
    try {
      await hseApi.importCsv(projectId, file);
      toast.success('HSE data imported');
      fetchHse();
    } catch {
      toast.error('HSE import failed');
    } finally {
      e.target.value = '';
    }
  };

  // ── Filtered data ─────────────────────────────────────────────────────────

  const lc = search.toLowerCase();
  const bimFiltered      = bimItems.filter(i      => !search || i.name?.toLowerCase().includes(lc));
  const mediaFiltered    = mediaItems.filter(i    => !search || i.name?.toLowerCase().includes(lc));
  const timelineFiltered = timelineItems.filter(i => !search || i.title?.toLowerCase().includes(lc));
  const hseFiltered      = hseItems.filter(i      => !search || i.title?.toLowerCase().includes(lc));

  const totalCount =
    bimItems.length + mediaItems.length + timelineItems.length + hseItems.length;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-screen-2xl">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-[#111827]">Files</h1>
        <p className="text-sm text-[#6B7280] mt-1">
          All BIM assets, project media, and data files
          {totalCount > 0 && (
            <span className="ml-1 text-[#9CA3AF]">· {totalCount} items total</span>
          )}
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none"
          />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search all files…"
            className="pl-9 pr-3 py-2 text-sm rounded-lg border border-[#E5E7EB] bg-white text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
          />
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 rounded-lg border border-[#E5E7EB] bg-white p-1 flex-wrap">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-[#2563EB] text-white shadow-sm'
                  : 'text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-10">
        {(activeTab === 'all' || activeTab === 'bim') && (
          <BimSection
            items={bimFiltered}
            loading={bimLoading}
            onOpenLibrary={() => setShowLibrary(true)}
          />
        )}

        {(activeTab === 'all' || activeTab === 'media') && (
          <MediaSection
            items={mediaFiltered}
            loading={mediaLoading}
            projectId={projectId}
            onUploadClick={() => mediaInputRef.current?.click()}
          />
        )}

        {(activeTab === 'all' || activeTab === 'data') && (
          <DataSection
            timelineItems={timelineFiltered}
            hseItems={hseFiltered}
            loading={timelineLoading || hseLoading}
            projectId={projectId}
            onHseImport={() => hseInputRef.current?.click()}
          />
        )}
      </div>

      {/* Hidden file inputs */}
      <input
        ref={mediaInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleMediaUpload}
      />
      <input
        ref={hseInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleHseImport}
      />

      {/* BIM Library Modal — reuses existing LibraryModal for upload flow */}
      <LibraryModal
        isOpen={showLibrary}
        onClose={() => { setShowLibrary(false); fetchBimItems(); }}
        onSelectItem={() => {}}
      />
    </div>
  );
}
