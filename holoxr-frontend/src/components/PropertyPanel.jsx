import React from 'react';

export default function PropertyPanel({ model, updateModelTransform, updateTextProperty, onPlayAnimation }) {
  if (!model) return <div className="p-4 bg-gray-100 h-full border-l relative">No item selected</div>;

  const handleChange = (field, value) => {
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) {
      updateModelTransform(model.id, { [field]: parsed });
    }
  };

  const handleTextPropertyChange = (field, value) => {
    updateTextProperty(model.id, { [field]: value });
  };

  const transform = model.transform || {};

  return (
    <div className="p-4 bg-gray-100 h-full border-l relative">
      <h2 className="text-lg font-semibold mb-2">Properties</h2>

      {/* Position */}
      <div className="mb-2">
        <label className="block font-medium">Position</label>
        <div className="flex gap-2">
          {['x', 'y', 'z'].map((axis) => (
            <input
              key={axis}
              type="number"
              value={transform[axis] || 0}
              onChange={(e) => handleChange(axis, e.target.value)}
              className="w-1/3 border p-1 text-sm"
            />
          ))}
        </div>
      </div>

      {/* Rotation */}
      <div className="mb-2">
        <label className="block font-medium">Rotation</label>
        <div className="flex gap-2">
          {['rx', 'ry', 'rz'].map((axis) => (
            <input
              key={axis}
              type="number"
              value={transform[axis] || 0}
              onChange={(e) => handleChange(axis, e.target.value)}
              className="w-1/3 border p-1 text-sm"
            />
          ))}
        </div>
      </div>

      {/* Scale */}
      <div className="mb-4">
        <label className="block font-medium">Scale</label>
        <div className="flex gap-2">
          {['sx', 'sy', 'sz'].map((axis) => (
            <input
              key={axis}
              type="number"
              value={transform[axis] || 1}
              onChange={(e) => handleChange(axis, e.target.value)}
              className="w-1/3 border p-1 text-sm"
            />
          ))}
        </div>
      </div>

      {/* Text Fields */}
      {model.type === 'text' && (
        <>
          <hr className="my-4" />
          <div className="mb-2">
            <label className="block font-medium">Text</label>
            <input
              type="text"
              value={model.content || ''}
              onChange={(e) => handleTextPropertyChange('content', e.target.value)}
              className="w-full border p-1 text-sm"
            />
          </div>

          <div className="mb-2">
            <label className="block font-medium">Font Size</label>
            <input
              type="number"
              value={model.fontSize || 1}
              onChange={(e) => handleTextPropertyChange('fontSize', e.target.value)}
              className="w-full border p-1 text-sm"
            />
          </div>

          <div className="mb-2">
            <label className="block font-medium">Color</label>
            <input
              type="color"
              value={model.color || '#ffffff'}
              onChange={(e) => handleTextPropertyChange('color', e.target.value)}
              className="w-full border p-1 text-sm"
            />
          </div>
        </>
      )}

      {/* Animation Section */}
      {model.type === 'model' && model.animations && model.animations.length > 0 && (
        <>
          <hr className="my-4" />
          <div className="mb-2">
            <label className="block font-medium">Animations</label>
            <select
              value={model.selectedAnimationIndex || 0}
              onChange={(e) => updateModelTransform(model.id, { selectedAnimationIndex: parseInt(e.target.value) })}
              className="w-full border p-1 text-sm"
            >
              {model.animations.map((name, index) => (
                <option key={index} value={index}>{name}</option>
              ))}
            </select>

            <button
              onClick={() => onPlayAnimation?.(model.id)}
              className="mt-2 bg-blue-500 text-white px-3 py-1 rounded text-sm"
            >
              ▶ Play
            </button>

            <div className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                checked={model.autoplay || false}
                onChange={(e) => updateModelTransform(model.id, { autoplay: e.target.checked })}
              />
              <label className="text-sm">Autoplay on Publish</label>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
