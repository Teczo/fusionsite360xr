import React from 'react';

export default function TopBar({
  onLibraryOpen,
  onTogglePreview,
  isPreviewing,
  onSaveProject,
  onPublishProject
}) {


  return (
    <div className="w-full h-15 bg-gray-800 text-white flex justify-between items-center px-4">
      <h2 className="text-lg font-bold">HoloXR</h2>
      <div className="flex gap-4">
        <button onClick={onLibraryOpen} className="bg-blue-500 px-3 py-1 rounded text-white">Library</button>
        <button onClick={onTogglePreview} className="bg-yellow-500 px-3 py-1 rounded text-white">Preview</button>
        <button onClick={onSaveProject} className="bg-indigo-600 px-3 py-1 rounded text-white">Save</button>
        <button
          className="bg-green-600 px-3 py-1 rounded text-white"
          onClick={onPublishProject}
        >
          Publish
        </button>

      </div>

    </div>
  );
}
