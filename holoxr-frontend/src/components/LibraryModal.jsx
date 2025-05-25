import React, { useRef, useState, useEffect } from 'react';
import {
  Text, Image as ImageIcon, Video, Music2, Box, BookOpen, QrCode, X
} from 'lucide-react';

const sidebarItems = [
  { label: 'Text', icon: <Text size={16} /> },
  { label: 'Image', icon: <ImageIcon size={16} /> },
  { label: 'Video', icon: <Video size={16} /> },
  { label: 'Audio', icon: <Music2 size={16} /> },
  { label: '3D shapes', icon: <Box size={16} /> },
  { label: 'Quiz', icon: <BookOpen size={16} /> },
  { label: 'QR Library', icon: <QrCode size={16} /> },
];

export default function LibraryModal({ isOpen, onClose, onSelectItem }) {
  const modelInputRef = useRef(null);
  const [items, setItems] = useState([]);
  const [activeTab, setActiveTab] = useState('All 3Ds');

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
    if (isOpen) fetchItems();
  }, [isOpen]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'model');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/upload`, {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      fetchItems();
    } catch (err) {
      console.error('❌ Upload failed:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
      <div className="bg-white w-full max-w-5xl h-[600px] rounded-xl shadow-lg flex relative">
        {/* Sidebar */}
        <div className="w-48 border-r p-4 space-y-3 text-sm text-gray-700">
          <div className="font-bold text-lg mb-4">Library</div>
          {sidebarItems.map((item) => (
            <button
              key={item.label}
              className={`flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-100 w-full text-left ${item.label === '3D shapes' ? 'bg-gray-100 font-semibold' : ''
                }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 p-6 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div className="flex gap-2">
              {['All 3Ds', 'HoloXR library', 'Team library'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium ${activeTab === tab ? 'bg-black text-white' : 'bg-gray-200 text-gray-800'
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <input
                type="file"
                ref={modelInputRef}
                onChange={handleFileChange}
                accept=".glb,.gltf"
                hidden
              />
              <button
                onClick={() => modelInputRef.current.click()}
                className="px-4 py-1.5 text-sm rounded-full border border-gray-300 hover:bg-gray-100"
              >
                + Browse media
              </button>
              <button onClick={onClose}>
                <X className="w-5 h-5 text-gray-500 hover:text-red-500" />
              </button>
            </div>
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Search 3Ds"
            className="mb-4 px-4 py-2 border rounded w-full text-sm"
          />

          {/* Assets Grid */}
          <div className="overflow-y-auto grid grid-cols-4 gap-4 pr-1">
            {items.length === 0 ? (
              <div className="col-span-4 text-center text-gray-400">No items available.</div>
            ) : (
              items.map((item, index) => (
                <button
                  key={index}
                  onClick={() => {
                    onSelectItem(item);
                    onClose();
                  }}
                  className="flex flex-col items-center justify-center p-4 border rounded hover:bg-gray-50"
                >
                  <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center mb-2">
                    <Box className="w-6 h-6 text-gray-600" />
                  </div>
                  <span className="text-xs text-gray-700 truncate">{item.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
