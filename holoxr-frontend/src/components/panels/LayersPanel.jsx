// LayersPanel.jsx
import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react"; // npm i lucide-react
import { EllipsisHorizontalIcon } from '@heroicons/react/24/outline';

export default function LayersPanel({
  models,
  selectedModelId,
  setSelectedModelId,
  onDeleteModel,
  onDuplicateModel,
  onOpenLibraryModal,
}) {
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const menuRefs = useRef({});

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (!menuOpenId) return;
      const el = menuRefs.current[menuOpenId];
      if (el && !el.contains(e.target)) setMenuOpenId(null);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpenId]);

  const handleDelete = (id) => {
    onDeleteModel?.(id);
    setConfirmDeleteId(null);
    setMenuOpenId(null);
  };

  const handleDuplicate = (id) => {
    onDuplicateModel?.(id);
    setMenuOpenId(null);
  };

  return (
    <div className="absolute top-20 bottom-4 left-4 w-60 bg-[#18191e] rounded-3xl shadow-xl p-5 z-10 overflow-y-auto text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-m font-semibold">Layers</h2>
        <button
          type="button"
          onClick={onOpenLibraryModal}
          className="p-1 rounded-md hover:bg-[#2a2b2f] focus:outline-none"
          title="Add from Library"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* List */}
      <ul className="space-y-1">
        {models.map((model) => {
          const isSelected = selectedModelId === model.id;
          return (
            <li
              key={model.id}
              className={[
                "flex items-center justify-between px-2 py-2 rounded-md cursor-pointer text-sm border border-transparent",
                isSelected ? "bg-[#2a2b2f] border-gray-700" : "hover:bg-[#2a2b2f]",
              ].join(" ")}
              onClick={() => setSelectedModelId(model.id)}
            >
              <span className="truncate">{model.name || model.id}</span>

              {/* Action Menu Trigger */}
              <div
                ref={(el) => (menuRefs.current[model.id] = el)}
                className="relative ml-2"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setMenuOpenId((prev) => (prev === model.id ? null : model.id))}
                  className="p-1 rounded-md hover:bg-gray-700/60 focus:outline-none"
                  title="More actions"
                >
                  <EllipsisHorizontalIcon className="w-5 h-5 text-gray-300 hover:text-white" />
                </button>

                {/* Menu */}
                {menuOpenId === model.id && (
                  <div className="absolute right-0 top-8 w-40 bg-[#2a2b2f] text-white rounded-md border border-gray-700 shadow-lg py-1 z-20">
                    <button
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-700"
                      onClick={() => handleDuplicate(model.id)}
                    >
                      Duplicate
                    </button>
                    <button
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-700 text-red-300"
                      onClick={() => setConfirmDeleteId(model.id)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Delete confirmation modal (dark themed to match panels) */}
      {confirmDeleteId && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] flex items-center justify-center z-30">
          <div className="bg-[#18191e] text-white w-72 rounded-2xl border border-gray-700 shadow-xl p-4">
            <p className="mb-4 text-sm font-medium">Delete this layer? This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button
                className="px-3 py-1.5 text-sm rounded-md bg-gray-600 hover:bg-gray-700"
                onClick={() => setConfirmDeleteId(null)}
              >
                Cancel
              </button>
              <button
                className="px-3 py-1.5 text-sm rounded-md bg-red-600 hover:bg-red-700"
                onClick={() => handleDelete(confirmDeleteId)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
