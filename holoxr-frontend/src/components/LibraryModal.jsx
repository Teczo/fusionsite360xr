import React, { useRef, useState, useEffect } from 'react';

export default function LibraryModal({ isOpen, onClose, onSelectItem }) {
  const modelInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const [items, setItems] = useState([]);

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
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      console.log('✅ Uploaded:', result);
      fetchItems(); // refresh list
    } catch (err) {
      console.error('❌ Upload failed:', err);
    }
  };

  const handleItemSelect = (item) => {
    console.log("Library selected item:", item); // 👈 Check if it has `.type` and `.url`
    onSelectItem(item); // send back to App → SceneCanvasPanel
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white w-[400px] rounded-lg shadow-xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Library</h2>
          <button onClick={onClose} className="text-red-600 text-lg font-bold">×</button>
        </div>

        <div className="flex flex-col gap-4 mb-4">
          <button onClick={handleModelClick} className="w-full bg-blue-600 text-white px-4 py-2 rounded">
            Upload 3D Model
          </button>
          <button onClick={handleImageClick} className="w-full bg-green-600 text-white px-4 py-2 rounded">
            Upload Image
          </button>
          <button
            onClick={() => {
              onSelectItem({
                type: 'text',
                name: 'New Text',
                content: 'Hello World',
              });
            }}
            className="w-full bg-purple-600 text-white px-4 py-2 rounded"
          >
            Add Text
          </button>

          <input type="file" accept=".glb,.gltf" ref={modelInputRef} style={{ display: 'none' }} onChange={(e) => handleFileChange(e, 'model')} />
          <input type="file" accept="image/*" ref={imageInputRef} style={{ display: 'none' }} onChange={(e) => handleFileChange(e, 'image')} />
        </div>

        <div className="border rounded p-2 h-48 overflow-y-auto">
          {items.map((item, index) => (
            <button
              key={index}
              onClick={() => handleItemSelect(item)}
              className="block w-full text-left px-2 py-1 rounded hover:bg-gray-100"
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
