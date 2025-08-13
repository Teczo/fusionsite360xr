import { useEffect, useState, useRef } from 'react';
import { FilePlus, ImagePlus, TextQuote, QrCode, Box, Trash2 } from 'lucide-react';
import SketchfabPanel from './SketchfabPanel';
import { formatDistanceToNow } from 'date-fns';


const sidebarItems = [
  { label: '3D shapes', icon: <FilePlus size={16} /> },
  { label: 'Images', icon: <ImagePlus size={16} /> },
  { label: 'Text', icon: <TextQuote size={16} /> },
  { label: 'UI', icon: <Box size={16} /> },
  { label: 'QR Code', icon: <QrCode size={16} /> },
  { label: 'Sketchfab', icon: <Box size={16} /> },
  { label: 'Trash', icon: <Trash2 size={16} /> }
];


const handleMoveToTrash = async (fileId) => {
  const confirmDelete = window.confirm("Are you sure you want to move this file to trash?");
  if (!confirmDelete) return;

  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/files/${fileId}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      alert("✅ File moved to trash.");
      fetchItems(); // Refresh list
      setOpenMenu(null);
    } else {
      const data = await res.json();
      console.error("❌ Delete failed:", data.error);
      alert("Failed to delete file.");
    }
  } catch (err) {
    console.error("❌ Delete request failed:", err);
    alert("Error deleting file.");
  }
};


export default function LibraryModal({ isOpen, onClose, onSelectItem }) {
  const modelInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState('3D shapes');
  const [items, setItems] = useState([]);
  const [isSketchfabOpen, setIsSketchfabOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const [trashedItems, setTrashedItems] = useState([]);


  const fetchItems = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/files`);
      const data = await res.json();
      setItems(data);
    } catch (err) {
      console.error("Failed to fetch items:", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchItems();

      if (activeTab === 'Trash') {
        fetchTrashedItems();
      }
    }
  }, [isOpen, activeTab]);

  const fetchTrashedItems = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/files/trashed`);
      const data = await res.json();
      setTrashedItems(data);
    } catch (err) {
      console.error("Failed to fetch trashed items:", err);
    }
  };


  const handleModelClick = () => modelInputRef.current.click();
  const handleImageClick = () => imageInputRef.current.click();

  const handleFileChange = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      console.log('✅ Uploaded:', result);
      fetchItems();
    } catch (err) {
      console.error('❌ Upload failed:', err);
    }
  };

  const handleItemSelect = (item) => {
    console.log("Library selected item:", item);
    onSelectItem(item);
    onClose();
  };

  const handleRestore = async (fileId) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/files/${fileId}/restore`, {
        method: 'PATCH',
      });
      if (res.ok) {
        alert("✅ File restored");
        fetchTrashedItems();
        fetchItems();
      }
    } catch (err) {
      console.error("Restore failed:", err);
    }
  };

  const handlePermanentDelete = async (fileId) => {
    const confirmDelete = window.confirm("This will permanently delete the file. Continue?");
    if (!confirmDelete) return;

    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/files/${fileId}/permanent`, {
        method: 'DELETE',
      });
      fetchTrashedItems();
    } catch (err) {
      console.error("Permanent delete failed:", err);
    }
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-[#18191e] w-[800px] h-[500px] rounded-lg shadow-xl flex">
        {/* Left Sidebar */}
        <div className="w-40 border-r p-2 flex flex-col gap-2">
          {sidebarItems.map((item) => (
            <button
              key={item.label}
              onClick={() => setActiveTab(item.label)}
              className={`flex items-center gap-2 px-3 py-2 rounded hover:bg-[#30323c] w-full text-left ${item.label === activeTab ? 'bg-[#30323c] font-semibold' : ''
                }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>


        {/* Right Content */}
        <div className="flex-1 p-4 relative overflow-y-auto">
          <button
            onClick={onClose}
            className="absolute top-2 right-4 text-gray-400 hover:text-red-500 text-xl"
          >
            ×
          </button>

          {activeTab === '3D shapes' && (
            <div className="flex flex-col gap-4">
              <button
                onClick={handleModelClick}
                className="bg-blue-600 text-white px-4 py-2 rounded w-48"
              >
                Upload 3D Model
              </button>
              <input
                type="file"
                accept=".glb,.gltf"
                ref={modelInputRef}
                style={{ display: 'none' }}
                onChange={(e) => handleFileChange(e, 'model')}
              />
              <div className="grid grid-cols-3 gap-4">
                {items.filter(i => i.type === 'model').map((item, index) => (
                  <div key={index} className="relative border rounded hover:shadow-lg transition group">

                    {/* Three Dot Button */}
                    <button
                      onClick={() => setOpenMenu(openMenu === item._id ? null : item._id)}
                      className="absolute top-2 left-2 z-20 bg-white rounded-full p-1 hover:bg-gray-200"
                    >
                      ⋮
                    </button>

                    {/* Thumbnail */}
                    <button
                      onClick={() => handleItemSelect(item)}
                      className="w-full h-32 bg-gray-100 flex items-center justify-center"
                    >
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt={item.name}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <span className="text-xs text-gray-400">No Thumbnail</span>
                      )}
                    </button>

                    {/* File name */}
                    <div className="p-2 text-sm truncate">{item.name}</div>

                    {/* Menu Panel */}
                    {openMenu === item._id && (
                      <div className="absolute top-10 left-2 w-64 bg-neutral-900 text-white rounded-xl shadow-xl z-30 text-sm">
                        {/* Top Section */}
                        <div className="p-3 border-b border-white/10">
                          <div className="truncate font-medium">{item.name}</div>
                          <div className="text-white/70 text-xs mt-1">
                            Uploaded by {item.uploader || 'Unknown'}<br />
                            {formatDistanceToNow(new Date(item.uploadedAt || item.createdAt))} ago
                          </div>
                        </div>

                        {/* Bottom Actions */}
                        <div className="p-2 space-y-1">
                          <button className="w-full text-left px-3 py-1 hover:bg-white/10 rounded flex items-center gap-2">
                            📁 Move to folder
                          </button>
                          <button className="w-full text-left px-3 py-1 hover:bg-white/10 rounded flex items-center gap-2">
                            ⬇️ Download
                          </button>
                          <button className="w-full text-left px-3 py-1 hover:bg-white/10 rounded flex items-center gap-2">
                            ✅ Select items
                          </button>
                          <button
                            className="w-full text-left px-3 py-1 hover:bg-red-500/20 text-red-400 rounded flex items-center gap-2"
                            onClick={() => handleMoveToTrash(item._id)}
                          >
                            🗑 Move to Trash
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

              </div>

            </div>
          )}

          {activeTab === 'UI' && (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => {
                    onSelectItem({
                      type: 'button',
                      name: 'Button',
                      uiKind: 'world',
                      appearance: { label: 'Tap', radius: 0.2 },
                      interactions: [], // empty for now; we’ll edit in Properties
                      transform: { x: 0, y: 1, z: 0, rx: 0, ry: 0, rz: 0, sx: 0.4, sy: 0.2, sz: 0.1 }
                    });
                    onClose();
                  }}
                  className="border rounded p-3 hover:bg-[#30323c] text-left"
                >
                  ➕ Button (world)
                </button>
              </div>
            </div>
          )}

          {activeTab === 'Images' && (
            <div className="flex flex-col gap-4">
              <button
                onClick={handleImageClick}
                className="bg-green-600 text-white px-4 py-2 rounded w-48"
              >
                Upload Image
              </button>
              <input
                type="file"
                accept="image/*"
                ref={imageInputRef}
                style={{ display: 'none' }}
                onChange={(e) => handleFileChange(e, 'image')}
              />
              <div className="grid grid-cols-3 gap-2">
                {items.filter(i => i.type === 'image').map((item, index) => (
                  <button
                    key={index}
                    onClick={() => handleItemSelect(item)}
                    className="block text-left border p-2 rounded hover:bg-gray-100"
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'Text' && (
            <div className="flex flex-col gap-4">
              <button
                onClick={() => {
                  onSelectItem({ type: 'text', name: 'New Text', content: 'Hello World' });
                  onClose();
                }}
                className="bg-purple-600 text-white px-4 py-2 rounded w-48"
              >
                Add Text
              </button>
            </div>
          )}
          {activeTab === 'Trash' && (
            <div className="grid grid-cols-3 gap-4">
              {trashedItems.map((item, index) => (
                <div key={index} className="border rounded p-3 bg-white shadow-md relative">
                  <div className="w-full h-32 bg-gray-100 mb-2 flex items-center justify-center">
                    {item.thumbnail ? (
                      <img src={item.thumbnail} alt={item.name} className="object-cover w-full h-full" />
                    ) : (
                      <span className="text-xs text-gray-400">No Thumbnail</span>
                    )}
                  </div>
                  <div className="text-sm font-semibold truncate">{item.name}</div>
                  <div className="text-xs text-gray-500 mb-2">
                    {formatDistanceToNow(new Date(item.uploadedAt))} ago
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRestore(item._id)}
                      className="text-xs text-green-600 hover:underline"
                    >
                      ♻️ Restore
                    </button>
                    <button
                      onClick={() => handlePermanentDelete(item._id)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      🗑 Delete Permanently
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {activeTab === 'Sketchfab' && (
            <SketchfabPanel onImport={(model) => {
              onSelectItem(model);
              onClose(); // optional
            }} />
          )}

        </div>
      </div>
    </div>
  );
}
