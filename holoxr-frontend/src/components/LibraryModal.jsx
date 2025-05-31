import { useEffect, useState, useRef } from 'react';
import { FilePlus, ImagePlus, TextQuote, QrCode, Box } from 'lucide-react';
import SketchfabModal from './SketchfabModal';

const sidebarItems = [
  { label: '3D shapes', icon: <FilePlus size={16} /> },
  { label: 'Images', icon: <ImagePlus size={16} /> },
  { label: 'Text', icon: <TextQuote size={16} /> },
  { label: 'QR Code', icon: <QrCode size={16} /> },
  { label: 'Sketchfab', icon: <Box size={16} /> },
];

export default function LibraryModal({ isOpen, onClose, onSelectItem }) {
  const modelInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState('3D shapes');
  const [items, setItems] = useState([]);
  const [isSketchfabOpen, setIsSketchfabOpen] = useState(false);

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

  const handleModelClick = () => modelInputRef.current.click();
  const handleImageClick = () => imageInputRef.current.click();

  const handleFileChange = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/upload`, {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white w-[800px] h-[500px] rounded-lg shadow-xl flex">
        {/* Left Sidebar */}
        <div className="w-40 border-r p-2 flex flex-col gap-2">
          {sidebarItems.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                if (item.label === 'Sketchfab') setIsSketchfabOpen(true);
                else setActiveTab(item.label);
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-100 w-full text-left ${item.label === activeTab ? 'bg-gray-100 font-semibold' : ''}`}
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
                  <button
                    key={index}
                    onClick={() => handleItemSelect(item)}
                    className="border rounded overflow-hidden hover:shadow-lg transition"
                  >
                    <div className="w-full h-32 bg-gray-100 flex items-center justify-center">
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt={item.name}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <span className="text-xs text-gray-400">No Thumbnail</span>
                      )}
                    </div>
                    <div className="p-2 text-sm truncate">{item.name}</div>
                  </button>
                ))}
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
        </div>
      </div>

      <SketchfabModal
        isOpen={isSketchfabOpen}
        onClose={() => setIsSketchfabOpen(false)}
        onImport={(model) => {
          onSelectItem(model); // ✅ This adds the model to sceneModels[]
          setIsSketchfabOpen(false);
        }}
      />

    </div>
  );
}
