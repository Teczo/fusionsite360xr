import { useState } from 'react';
import { Trash2 } from 'lucide-react'; // npm install lucide-react

export default function LayersPanel({ models, selectedModelId, setSelectedModelId, onDeleteModel }) {
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const handleDelete = (id) => {
    onDeleteModel(id);
    setConfirmDeleteId(null);
  };



  return (
    <div className="absolute top-20 bottom-4 left-4 w-60 bg-[#18191e] rounded-3xl shadow-[0_4px_12px_4px_rgba(1,1,1,0.3)] p-4 z-10 overflow-y-auto">
      <h2 className="font-bold mb-2 text-white">Layers</h2>
      <ul className="space-y-1">
        {models.map((model) => (
          <li
            key={model.id}
            className={`flex justify-between items-center px-2 py-1 rounded cursor-pointer ${selectedModelId === model.id ? 'bg-blue-200' : 'hover:bg-gray-200'
              }`}
            onClick={() => setSelectedModelId(model.id)}
          >
            <span className="truncate">{model.name}</span>
            <Trash2
              className="w-4 h-4 text-red-500 hover:text-red-700"
              onClick={(e) => {
                e.stopPropagation();
                setConfirmDeleteId(model.id);
              }}
            />
          </li>
        ))}
      </ul>

      {/* Delete confirmation modal */}
      {confirmDeleteId && (
        <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-white p-4 rounded shadow w-64">
            <p className="mb-4 text-sm font-medium">Are you sure to delete?</p>
            <div className="flex justify-end gap-2">
              <button
                className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
                onClick={() => setConfirmDeleteId(null)}
              >
                No
              </button>
              <button
                className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                onClick={() => handleDelete(confirmDeleteId)}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
