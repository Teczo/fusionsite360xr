import React from 'react';
import { BookOpen, Eye, Save, Upload } from 'lucide-react';

export default function TopBar({
  onLibraryOpen,
  onTogglePreview,
  isPreviewing,
  onSaveProject,
  onPublishProject,
  projectName,
  onBack,
  onShowQRCode
}) {



  return (
    <div className="absolute top-4 left-4 right-4 z-20 bg-black/30 backdrop-blur-lg border border-white/10 shadow-xl rounded-3xl text-white flex justify-between items-center px-4 py-2 ">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-transparent hover:bg-gray-300 transition"
        >
          <img src="/holo-icon.png" alt="Back" className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-semibold">{projectName || 'Untitled Project'}</h2>
      </div>

      <div className="flex gap-4">
        <button
          onClick={onLibraryOpen}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-transparent hover:bg-gray-300 transition"
          title="Library"
        >
          <BookOpen size={16} className="text-white" />
        </button>

        <button
          onClick={onTogglePreview}
          className={
            "w-9 h-9 flex items-center justify-center rounded-full transition " +
            (isPreviewing
              ? "bg-emerald-600 hover:bg-emerald-500"
              : "bg-transparent hover:bg-gray-300")
          }
          title={isPreviewing ? "Stop Preview" : "Preview"}
        >
          <Eye size={16} className="text-white" />
        </button>

        <button
          onClick={onSaveProject}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-transparent hover:bg-gray-300 transition"
          title="Save"
        >
          <Save size={16} className="text-white" />
        </button>

        <button
          onClick={() => {
            onPublishProject?.();
            onShowQRCode?.();
          }}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-transparent hover:bg-gray-300 transition"
          title="Publish"
        >
          <Upload size={16} className="text-white" />
        </button>


      </div>

    </div>
  );
}
