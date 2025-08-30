import { useEffect, useState, useRef } from 'react';
import {
  Box,
  FolderPlus,
  MoreVertical,
  Plus,
  QrCode,
  Search,
  Settings2,
  Trash2,
  Upload,
  ImagePlus,
  FilePlus,
  TextQuote
} from 'lucide-react';
import SketchfabPanel from './SketchfabPanel';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
// npm i fflate
import { unzipSync } from 'fflate';
import { v4 as uuid } from "uuid";

// Utility: classnames
const cx = (...args) => args.filter(Boolean).join(' ');

// Sidebar categories (future-proof: add taxonomy tags later)
const sidebarItems = [
  { key: 'all', label: 'All assets', icon: <Box size={16} /> },
  { key: 'model', label: '3D models', icon: <FilePlus size={16} /> },
  { key: 'image', label: 'Images', icon: <ImagePlus size={16} /> },
  { key: 'text', label: 'Text', icon: <TextQuote size={16} /> },
  { key: 'ui', label: 'UI', icon: <Box size={16} /> },
  { key: 'qrcode', label: 'QR Code', icon: <QrCode size={16} /> },
  { key: 'sketchfab', label: 'Sketchfab', icon: <Box size={16} /> },
  { key: 'trash', label: 'Trash', icon: <Trash2 size={16} /> },
];

// Client-side thumbnail for images (JPEG/PNG/WebP/HEIC if browser decodes it)
// Uses createImageBitmap to auto-fix EXIF orientation where supported.
async function createImageThumbnailBlob(file, { size = 512, format = 'image/webp', quality = 0.9 } = {}) {
  // Fast path: if it's already small, you can skip re-encode (optional)
  // But re-encoding normalizes format & reduces size; I keep it on.
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // "cover" crop to a square
  const srcW = bitmap.width;
  const srcH = bitmap.height;
  const srcAspect = srcW / srcH;

  let drawW, drawH, sx, sy, sWidth, sHeight;
  if (srcAspect > 1) {
    // wider than tall → crop sides
    sHeight = srcH;
    sWidth = Math.round(srcH * 1); // square
    sx = Math.round((srcW - sWidth) / 2);
    sy = 0;
  } else {
    // taller than wide → crop top/bottom
    sWidth = srcW;
    sHeight = Math.round(srcW * 1);
    sx = 0;
    sy = Math.round((srcH - sHeight) / 2);
  }

  // draw cropped region to square canvas
  ctx.drawImage(bitmap, sx, sy, sWidth, sHeight, 0, 0, size, size);

  // export to WebP
  const blob = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), format, quality)
  );

  bitmap.close?.();
  return blob;
}


async function createModelThumbnailBlob(file, { size = 512 } = {}) {
  // 1) Resolve a GLB Blob (direct .glb OR first .glb inside .zip)
  let glbBlob;
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.zip')) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const entries = unzipSync(bytes); // { [filename]: Uint8Array }
    const glbName = Object.keys(entries).find(n => n.toLowerCase().endsWith('.glb'));
    if (!glbName) throw new Error('No .glb found in ZIP');
    glbBlob = new Blob([entries[glbName]], { type: 'model/gltf-binary' });
  } else {
    glbBlob = file; // .glb (thin-slice: external .gltf not handled here)
  }

  const url = URL.createObjectURL(glbBlob);

  // 2) Set up an offscreen Three.js render
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(size, size);
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x0b0d10, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 1000);

  // simple neutral lighting
  scene.add(new THREE.AmbientLight(0xffffff, 0.8));
  const dir = new THREE.DirectionalLight(0xffffff, 1);
  dir.position.set(3, 5, 8);
  scene.add(dir);

  // 3) Load model
  const loader = new GLTFLoader();
  let gltf;
  try {
    gltf = await loader.loadAsync(url);
  } catch (err) {
    const msg = err?.message || String(err);
    console.error('Failed to load model for thumbnail:', msg, err);
    throw err;
  }
  const model = gltf.scene || gltf.scenes?.[0];
  scene.add(model);

  // 4) Frame camera to the model
  const box = new THREE.Box3().setFromObject(model);
  const sizeV = new THREE.Vector3(); box.getSize(sizeV);
  const center = new THREE.Vector3(); box.getCenter(center);
  const maxDim = Math.max(sizeV.x, sizeV.y, sizeV.z);
  const fov = camera.fov * (Math.PI / 180);
  const dist = (maxDim / 2) / Math.tan(fov / 2);
  camera.position.set(center.x + maxDim * 0.4, center.y + maxDim * 0.3, center.z + dist * 1.2);
  camera.lookAt(center);
  camera.updateProjectionMatrix();

  // 5) Render → WebP blob
  renderer.render(scene, camera);
  const blob = await new Promise(resolve =>
    renderer.domElement.toBlob(b => resolve(b), 'image/webp', 0.9)
  );

  // 6) Cleanup
  URL.revokeObjectURL(url);
  renderer.dispose();
  scene.traverse(obj => {
    if (obj.isMesh) {
      obj.geometry?.dispose?.();
      if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose?.());
      else obj.material?.dispose?.();
    }
  });

  return blob; // WebP thumbnail
}


// Simple dark confirm dialog
function ConfirmDialog({ open, title, description, confirmText = 'Confirm', confirmTone = 'red', onCancel, onConfirm }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-[1px] flex items-center justify-center">
      <div className="bg-[#18191e] text-white w-[420px] rounded-2xl border border-gray-700 shadow-2xl p-5">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        {description && <p className="text-sm text-gray-300 mb-5">{description}</p>}
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm rounded-md bg-gray-600 hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={cx(
              'px-3 py-1.5 text-sm rounded-md',
              confirmTone === 'red' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
            )}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- UI presets (inline creators for the UI tab) ---
function UIPresetCard({ title, subtitle, onCreate }) {
  return (
    <button
      onClick={onCreate}
      className="group relative rounded-xl overflow-hidden border border-gray-700 bg-[#1f2025] hover:bg-[#24252b] transition-colors p-4 text-left"
    >
      <div className="text-white font-semibold">{title}</div>
      <div className="text-xs text-gray-400 mt-1">{subtitle}</div>
      <div className="mt-3 inline-flex items-center gap-2 text-sm text-blue-300 group-hover:text-blue-200">
        <span>Create</span>
        <span>→</span>
      </div>
    </button>
  );
}

function renderUiPresets({ onSelectItem, onClose }) {
  const commonTransform = { x: 0, y: 1, z: 0, rx: 0, ry: 0, rz: 0, sx: 1, sy: 1, sz: 1 };

  const createUIButton = () => {
    onSelectItem({
      type: 'button',
      name: 'UIButton3D',
      appearance: {
        kind: 'primary',
        text: 'Press me',
        width: 1.2,
        height: 0.4,
        depth: 0.1,
        color: '#3b82f6',         // Tailwind blue-600
        textColor: '#ffffff',
        cornerRadius: 0.08,
      },
      interactions: [{ type: 'toggleVisibility', targetId: null }],         // add in PropertyPanel later
      transform: commonTransform,
    });
    onClose();
  };

  const createUILabel = () => {
    onSelectItem({
      type: 'label',
      name: 'UILabel3D',
      content: 'New Label',
      fontSize: 0.35,
      color: '#ffffff',
      appearance: {
        bg: '#111827',
        padding: [0.3, 0.15],
        borderRadius: 0.08,
        lineWidth: 2,
      },
      targetId: null,              // pick in PropertyPanel
      transform: commonTransform,
    });
    onClose();
  };

  function makeQuiz({
    title = "Safety Basics",
    instructions = "Answer the questions. Tap Start to begin.",
    settings = { feedbackMode: "immediate", shuffle: true, passScore: 70 },
    questions = [
      { id: "q1", type: "mcq", prompt: "Wear PPE in the lab?", options: ["Never", "Sometimes", "Always"], correct: 2, explanation: "PPE is mandatory.", points: 1 },
      { id: "q2", type: "boolean", prompt: "Spills must be reported.", correct: true, points: 1 },
      { id: "q3", type: "text", prompt: "What does PPE stand for?", correct: "personal protective equipment", points: 2 }
    ],
  } = {}) {
    return {
      id: `quiz-${uuid()}`,
      type: "quiz",
      name: title,
      transform: { x: 0, y: 1.4, z: -2, rx: 0, ry: 0, rz: 0, sx: 1, sy: 1, sz: 1 },
      appearance: { bg: "#111827", fg: "#fff", width: 3.6, billboard: true },
      quiz: { title, instructions, settings, questions }
    };
  }

  const createUIQuiz = () => {
    onSelectItem(makeQuiz());
    onClose();
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <UIPresetCard
        title="3D Text"
        subtitle="3D Text in AR Space"
        onCreate={createUIButton}
      />
      <UIPresetCard
        title="3D Button"
        subtitle="Clickable 3D UI button with actions"
        onCreate={createUIButton}
      />
      <UIPresetCard
        title="Label with Leader Line"
        subtitle="Text label that points to an object"
        onCreate={createUILabel}
      />
      <UIPresetCard title="Quiz System" subtitle="Multiple choice questions in AR space" onCreate={createUIQuiz} />

    </div>
  );
}


export default function LibraryModal({ isOpen, onClose, onSelectItem }) {
  const modelInputRef = useRef(null);
  const imageInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('all'); // keys from sidebarItems
  const [items, setItems] = useState([]);
  const [trashedItems, setTrashedItems] = useState([]);
  const [openMenu, setOpenMenu] = useState(null);
  const [isSketchfabOpen, setIsSketchfabOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);

  // Confirmation modal state
  const [confirm, setConfirm] = useState({
    open: false,
    type: null, // 'trash' | 'permadelete'
    item: null,
  });

  // Fetchers
  const fetchItems = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/files`);
      const data = await res.json();
      setItems(data || []);
    } catch (err) {
      console.error('Failed to fetch items:', err);
    }
  };

  const fetchTrashedItems = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/files/trashed`);
      const data = await res.json();
      setTrashedItems(data || []);
    } catch (err) {
      console.error('Failed to fetch trashed items:', err);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    fetchItems();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (activeTab === 'trash') fetchTrashedItems();
  }, [isOpen, activeTab]);

  // Upload handlers
  const handleModelClick = () => modelInputRef.current?.click();
  const handleImageClick = () => imageInputRef.current?.click();

  const handleFileChange = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    try {
      if (type === 'image') {
        try {
          const thumb = await createImageThumbnailBlob(file, { size: 512 });
          if (thumb) formData.append('thumbnail', thumb, 'thumb.webp');
        } catch (err) {
          console.warn('Image thumbnail generation failed; uploading without one:', err);
        }
      }

      if (type === 'model') {
        try {
          const thumb = await createModelThumbnailBlob(file, { size: 512 });
          if (thumb) formData.append('thumbnail', thumb, 'thumb.webp');
        } catch (err) {
          console.warn('Thumbnail generation failed; uploading without one:', err);
        }
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      if (response.ok) {
        toast.success('✅ Uploaded');
        fetchItems();
      } else {
        toast.error(result?.error || 'Upload failed');
      }
    } catch (err) {
      console.error('❌ Upload failed:', err);
      toast.error('Upload failed');
    } finally {
      e.target.value = ''; // allow re-uploading same filename
    }
  };


  // Actions
  const handleMoveToTrash = async (fileId) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/files/${fileId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('✅ File moved to trash.');
        fetchItems();
        setOpenMenu(null);
        if (selectedItem?._id === fileId) setSelectedItem(null);
      } else {
        const data = await res.json();
        console.error('❌ Delete failed:', data.error);
        toast.error('Failed to delete file.');
      }
    } catch (err) {
      console.error('❌ Delete request failed:', err);
      toast.error('Error deleting file.');
    }
  };

  const handleRestore = async (fileId) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/files/${fileId}/restore`, {
        method: 'PATCH',
      });
      if (res.ok) {
        toast.success('✅ File restored');
        fetchTrashedItems();
        fetchItems();
      } else {
        toast.error('Failed to restore');
      }
    } catch (err) {
      console.error('Restore failed:', err);
      toast.error('Error restoring file.');
    }
  };

  const handlePermanentDelete = async (fileId) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/files/${fileId}/permanent`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('✅ File deleted permanently');
        fetchTrashedItems();
        if (selectedItem?._id === fileId) setSelectedItem(null);
      } else {
        toast.error('Failed to delete permanently');
      }
    } catch (err) {
      console.error('Permanent delete failed:', err);
      toast.error('Error deleting file.');
    }
  };

  // Filtering
  const filtered = items.filter((i) => {
    const matchType =
      activeTab === 'all' ? true :
        activeTab === 'ui' ? i.type === 'ui' :
          activeTab === 'text' ? i.type === 'text' :
            activeTab === 'qrcode' ? i.type === 'qrcode' :
              activeTab === 'model' ? i.type === 'model' :
                activeTab === 'image' ? i.type === 'image' :
                  activeTab === 'sketchfab' ? false : // Sketchfab handled separately
                    activeTab === 'trash' ? false : // separate list
                      true;

    const matchSearch =
      !search?.trim() ||
      i.name?.toLowerCase().includes(search.toLowerCase()) ||
      i.uploader?.toLowerCase().includes(search.toLowerCase());

    return matchType && matchSearch;
  });

  // Card component
  const AssetCard = ({ item }) => {
    const isMenuOpen = openMenu === item._id;

    return (
      <div
        className="relative rounded-xl overflow-hidden border border-gray-700 bg-[#1f2025] hover:bg-[#24252b] transition-colors"
      >
        {/* Kebab */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setOpenMenu(isMenuOpen ? null : item._id);
          }}
          className="absolute top-2 right-2 z-20 p-1 rounded-md bg-[#2a2b2f] hover:bg-[#353741]"
          title="More actions"
        >
          <MoreVertical size={16} />
        </button>

        {/* Thumb */}
        <button
          onClick={() => setSelectedItem(item)}
          className="w-full h-36 bg-[#2a2b2f] flex items-center justify-center"
          title="Preview"
        >
          {item.thumbnail ? (
            <img src={item.thumbnail} alt={item.name} className="object-cover w-full h-full" />
          ) : (
            <span className="text-xs text-gray-400">No Thumbnail</span>
          )}
        </button>

        {/* Body */}
        <div className="p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate text-sm text-white">{item.name}</div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#33353d] text-gray-300 uppercase">
              {item.type}
            </span>
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            {item.uploadedAt || item.createdAt
              ? `${formatDistanceToNow(new Date(item.uploadedAt || item.createdAt))} ago`
              : '—'}
          </div>

          {/* Hover import */}
          <div className="mt-3">
            <button
              onClick={() => {
                onSelectItem(item);
                onClose();
              }}
              className="w-full text-sm bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded-md"
            >
              Import
            </button>
          </div>
        </div>

        {/* Popover Menu */}
        {isMenuOpen && (
          <div
            className="absolute right-2 top-9 z-80 w-60 rounded-xl border border-gray-700 bg-[#1c1d22] shadow-2xl overflow-hidden"
            onMouseLeave={() => setOpenMenu(null)}
          >
            <div className="px-3 py-2 border-b border-gray-700">
              <div className="truncate text-sm text-white">{item.name}</div>
              <div className="text-xs text-gray-400">
                Uploaded by {item.uploader || 'Unknown'}
              </div>
            </div>
            <div className="py-1">
              <button className="w-full text-left px-3 py-2 text-sm hover:bg-[#2a2b2f]">📁 Move to folder</button>
              <button className="w-full text-left px-3 py-2 text-sm hover:bg-[#2a2b2f]">🏷️ Add tags</button>
              <button className="w-full text-left px-3 py-2 text-sm hover:bg-[#2a2b2f]">🧪 Check compatibility</button>
              <button className="w-full text-left px-3 py-2 text-sm hover:bg-[#2a2b2f]">⬇️ Download</button>
              <button
                className="w-full text-left px-3 py-2 text-sm hover:bg-red-500/15 text-red-400"
                onClick={() => {
                  setConfirm({ open: true, type: 'trash', item });
                  setOpenMenu(null);
                }}
              >
                🗑 Move to Trash
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  const onConfirm = async () => {
    if (!confirm.open || !confirm.item) return;
    const id = confirm.item._id;
    const t = confirm.type;

    setConfirm({ open: false, type: null, item: null });
    if (t === 'trash') await handleMoveToTrash(id);
    if (t === 'permadelete') await handlePermanentDelete(id);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-[#18191e] w-[1100px] h-[640px] rounded-2xl shadow-2xl border border-gray-700 flex flex-col overflow-hidden">
        {/* Modal header */}
        <div className="h-12 flex items-center justify-between px-4 border-b border-gray-700">
          <h2 className="text-sm font-semibold text-white">Asset Library</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white rounded-md px-2 py-1"
            aria-label="Close"
            title="Close"
          >
            ×
          </button>
        </div>
        <div className="flex flex-1 min-h-0">
          {/* Sidebar */}
          <aside className="w-56 h-full border-r border-gray-700 p-3 space-y-1">
            {sidebarItems.map((item) => (
              <button
                key={item.key}
                onClick={() => {
                  setActiveTab(item.key);
                  setSelectedItem(null);
                }}
                className={cx(
                  'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
                  activeTab === item.key ? 'bg-[#2a2b2f] font-semibold' : 'hover:bg-[#222329]'
                )}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </aside>

          {/* Main */}
          <section className="flex-1 h-full flex flex-col">
            {/* Header / Toolbar */}
            <div className="px-4 py-3 border-b border-gray-700 flex items-center gap-2 relative z-[60] overflow-visible">

              <h2 className="text-lg font-semibold">
                {activeTab === 'trash' ? 'Trash' :
                  activeTab === 'sketchfab' ? 'Sketchfab' : 'Library'}
              </h2>

              {/* Search */}
              {activeTab !== 'sketchfab' && (
                <div className="ml-auto relative w-72">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2" size={16} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search assets…"
                    className="w-full pl-8 pr-3 py-2 text-sm rounded-lg bg-[#2a2b2f] border border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Upload dropdown */}
              {activeTab !== 'trash' && activeTab !== 'sketchfab' && (
                <div className="relative">
                  <button
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg text-sm"
                    onClick={(e) => {
                      // simple toggled inline menu: use title to avoid state bloat
                      const el = e.currentTarget.nextElementSibling;
                      if (el) el.classList.toggle('hidden');
                    }}
                  >
                    <Upload size={16} />
                    Upload
                  </button>
                  <div className="absolute right-0 mt-2 w-44 rounded-lg border border-gray-700 bg-[#1c1d22] shadow-xl py-1 hidden z-[70]">
                    <button
                      onClick={handleModelClick}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-[#2a2b2f]"
                    >
                      3D Model (.glb/.gltf)
                    </button>
                    <button
                      onClick={handleImageClick}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-[#2a2b2f]"
                    >
                      Image
                    </button>
                    <button
                      onClick={() => {
                        // Quick add text asset placeholder
                        onSelectItem({ type: 'text', name: 'New Text', content: 'Hello World' });
                        onClose();
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-[#2a2b2f]"
                    >
                      Text
                    </button>
                  </div>
                </div>
              )}

              {/* New Folder (stub) */}
              {activeTab !== 'trash' && activeTab !== 'sketchfab' && (
                <button
                  className="flex items-center gap-2 bg-[#2a2b2f] hover:bg-[#2f3139] px-3 py-2 rounded-lg text-sm border border-gray-700"
                  title="Coming soon"
                >
                  <FolderPlus size={16} />
                  New Folder
                </button>
              )}

              {/* Filters (stub) */}
              {activeTab !== 'trash' && activeTab !== 'sketchfab' && (
                <button
                  className="flex items-center gap-2 bg-[#2a2b2f] hover:bg-[#2f3139] px-3 py-2 rounded-lg text-sm border border-gray-700"
                  title="Filter by category, tags, device, polycount… (coming soon)"
                >
                  <Settings2 size={16} />
                  Filters
                </button>
              )}

              {/* hidden inputs */}
              <input type="file" accept=".glb,.gltf,.zip" ref={modelInputRef} className="hidden" onChange={(e) => handleFileChange(e, 'model')} />

              <input
                type="file"
                accept=".png,.jpg,.jpeg,.webp"
                ref={imageInputRef}
                className="hidden"
                onChange={(e) => handleFileChange(e, 'image')}
              />
            </div>

            {/* Body */}
            <div className="flex-1 overflow-hidden flex">
              {/* Grid list */}
              <div className="flex-1 overflow-auto p-4">
                {/* Tabs content */}
                {activeTab === 'sketchfab' ? (
                  <div className="h-full">
                    <SketchfabPanel
                      onImport={(model) => {
                        onSelectItem(model);
                        onClose();
                      }}
                    />
                  </div>
                ) : activeTab === 'trash' ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {trashedItems.map((item) => (
                      <div key={item._id} className="rounded-xl border border-gray-700 bg-[#1f2025] p-3">
                        <div className="w-full h-32 bg-[#2a2b2f] mb-2 flex items-center justify-center rounded-lg overflow-hidden">
                          {item.thumbnail ? (
                            <img src={item.thumbnail} alt={item.name} className="object-cover w-full h-full" />
                          ) : (
                            <span className="text-xs text-gray-400">No Thumbnail</span>
                          )}
                        </div>
                        <div className="text-sm truncate">{item.name}</div>
                        <div className="text-[11px] text-gray-400 mb-3">
                          {item.uploadedAt ? `${formatDistanceToNow(new Date(item.uploadedAt))} ago` : '—'}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRestore(item._id)}
                            className="flex-1 text-xs bg-gray-600 hover:bg-gray-700 rounded-md py-1.5"
                          >
                            Restore
                          </button>
                          <button
                            onClick={() => setConfirm({ open: true, type: 'permadelete', item })}
                            className="flex-1 text-xs bg-red-600 hover:bg-red-700 rounded-md py-1.5"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                    {trashedItems.length === 0 && (
                      <div className="text-sm text-gray-400">Trash is empty.</div>
                    )}
                  </div>
                ) : activeTab === 'ui' ? (
                  // Built-in UI creators (buttons/labels). You can also list saved UI assets below, if you store them.
                  <>
                    {renderUiPresets({ onSelectItem, onClose })}
                    {/* If you later store UI assets (type:'ui') in your backend, you can also list them: */}
                    {filtered.length > 0 && (
                      <div className="mt-6">
                        <div className="text-xs uppercase text-gray-400 mb-2">Saved UI Assets</div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {filtered.map((item) => (
                            <AssetCard key={item._id} item={item} />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filtered.map((item) => (
                      <AssetCard key={item._id} item={item} />
                    ))}
                    {filtered.length === 0 && (
                      <div className="text-sm text-gray-400">No assets found.</div>
                    )}
                  </div>
                )
                }
              </div>

              {/* Preview drawer */}
              {activeTab !== 'sketchfab' && selectedItem && (
                <div className="w-[320px] border-l border-gray-700 p-4 overflow-auto bg-[#1a1b20]">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-base font-semibold">Preview</h3>
                    <button
                      className="text-gray-400 hover:text-white"
                      onClick={() => setSelectedItem(null)}
                      title="Close preview"
                    >
                      ×
                    </button>
                  </div>

                  <div className="w-full h-40 bg-[#2a2b2f] rounded-lg flex items-center justify-center overflow-hidden mb-3">
                    {selectedItem.thumbnail ? (
                      <img src={selectedItem.thumbnail} alt={selectedItem.name} className="object-cover w-full h-full" />
                    ) : (
                      <span className="text-xs text-gray-400">No Thumbnail</span>
                    )}
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="font-medium">{selectedItem.name}</div>
                    <div className="text-gray-400">Type: {selectedItem.type}</div>
                    <div className="text-gray-400">
                      Uploaded {selectedItem.uploadedAt ? formatDistanceToNow(new Date(selectedItem.uploadedAt)) : '—'} ago
                    </div>

                    {/* FUTURE: metadata */}
                    <div className="pt-2 border-t border-gray-700">
                      <div className="text-xs text-gray-400 mb-1">Metadata</div>
                      <div className="text-xs text-gray-300">
                        {/* placeholders for future tags like subject/chapter/device/polycount */}
                        Tags: {selectedItem?.metadata?.tags?.join(', ') || '—'}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <button
                      onClick={() => {
                        onSelectItem(selectedItem);
                        onClose();
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md text-sm"
                    >
                      Import to Scene
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button className="bg-[#2a2b2f] hover:bg-[#33353e] border border-gray-700 rounded-md py-1.5 text-sm">
                        Versions
                      </button>
                      <button className="bg-[#2a2b2f] hover:bg-[#33353e] border border-gray-700 rounded-md py-1.5 text-sm">
                        Tag
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button className="bg-[#2a2b2f] hover:bg-[#33353e] border border-gray-700 rounded-md py-1.5 text-sm">
                        Move
                      </button>
                      <button
                        className="bg-red-600 hover:bg-red-700 rounded-md py-1.5 text-sm"
                        onClick={() => setConfirm({ open: true, type: 'trash', item: selectedItem })}
                      >
                        Trash
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Confirm dialog */}
      <ConfirmDialog
        open={confirm.open}
        title={confirm.type === 'permadelete' ? 'Delete permanently?' : 'Move to Trash?'}
        description={
          confirm.type === 'permadelete'
            ? 'This action cannot be undone.'
            : 'You can restore this from Trash later.'
        }
        confirmText={confirm.type === 'permadelete' ? 'Delete' : 'Move to Trash'}
        confirmTone={confirm.type === 'permadelete' ? 'red' : 'blue'}
        onCancel={() => setConfirm({ open: false, type: null, item: null })}
        onConfirm={onConfirm}
      />
    </div>
  );
}
