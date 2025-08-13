import React from 'react';

export default function PropertyPanel({ model, models, updateModelTransform, updateTextProperty, onPlayAnimation, updateModelProps }) {
  if (!model) return (
    <div className="absolute top-20 bottom-4 right-4 w-72 bg-[#18191e] rounded-3xl shadow-xl p-5 z-10 overflow-y-auto text-white space-y-4">
      <h2 className="text-lg font-semibold">Properties</h2>
    </div>
  );

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
    <div className="absolute top-20 bottom-4 right-4 w-72 bg-[#18191e] rounded-3xl shadow-xl p-5 z-10 overflow-y-auto text-white space-y-4">
      <h2 className="text-lg font-semibold">Properties</h2>

      {/* Transform Section */}
      {[
        { label: 'Position', keys: ['x', 'y', 'z'], default: 0 },
        { label: 'Rotation', keys: ['rx', 'ry', 'rz'], default: 0 },
        { label: 'Scale', keys: ['sx', 'sy', 'sz'], default: 1 }
      ].map(({ label, keys, default: def }) => (
        <div key={label}>
          <label className="block text-sm font-medium mb-1">{label}</label>
          <div className="flex gap-2">
            {keys.map(axis => (
              <input
                key={axis}
                type="number"
                value={transform[axis] ?? def}
                onChange={(e) => handleChange(axis, e.target.value)}
                className="w-1/3 rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            ))}
          </div>
        </div>
      ))}

      {/* Text Properties */}
      {model.type === 'text' && (
        <div className="space-y-3 pt-2 border-t border-gray-700">
          <div>
            <label className="block text-sm font-medium mb-1">Text</label>
            <input
              type="text"
              value={model.content || ''}
              onChange={(e) => handleTextPropertyChange('content', e.target.value)}
              className="w-full rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Font Size</label>
            <input
              type="number"
              value={model.fontSize || 1}
              onChange={(e) => handleTextPropertyChange('fontSize', e.target.value)}
              className="w-full rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Color</label>
            <input
              type="color"
              value={model.color || '#ffffff'}
              onChange={(e) => handleTextPropertyChange('color', e.target.value)}
              className="w-full rounded-md h-8 p-1 border border-gray-600"
            />
          </div>
        </div>
      )}

      {model.type === 'button' && (
        <div className="space-y-3 pt-2 border-t border-gray-700">
          <div>
            <label className="block text-sm font-medium mb-1">Label</label>
            <input
              type="text"
              value={model.appearance?.label || 'Tap'}
              onChange={(e) => updateModelProps(model.id, { appearance: { ...(model.appearance || {}), label: e.target.value } })}
              className="w-full rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">On Tap → Action</label>
            <select
              value={model.interactions?.[0]?.type || 'toggleVisibility'}
              onChange={(e) => {
                const current = model.interactions?.[0] || {};
                updateModelProps(model.id, { interactions: [{ ...current, type: e.target.value }] });
              }}
              className="w-full rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600"
            >
              <option value="toggleVisibility">Toggle Visibility</option>
              <option value="playPauseAnimation">Play/Pause Animation</option>
              <option value="changeProject">Change Project</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Target</label>
            <select
              value={model.interactions?.[0]?.targetId || ''}
              onChange={(e) => {
                const current = model.interactions?.[0] || {};
                updateModelProps(model.id, { interactions: [{ ...current, targetId: e.target.value }] });
              }}
              className="w-full rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600"
            >
              <option value="">— Select object —</option>
              {models?.filter(m => m.id !== model.id && m.type !== 'button').map(m => (
                <option key={m.id} value={m.id}>{m.name || m.id}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Animation Controls */}
      {model.type === 'model' && model.animations?.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-gray-700">
          <div>
            <label className="block text-sm font-medium mb-1">Animations</label>
            <select
              value={model.selectedAnimationIndex || 0}
              onChange={(e) =>
                updateModelTransform(model.id, {
                  selectedAnimationIndex: parseInt(e.target.value),
                  playAnimationKey: Date.now(), // autoplay when selection changes
                })
              }
              className="w-full rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600"
            >
              {model.animations.map((clip, index) => (
                <option key={index} value={index}>
                  {clip.name || `Animation ${index + 1}`}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 italic mt-1">
              🎞 Current Animation: {model.animations[model.selectedAnimationIndex]?.name || 'None'}
            </p>
          </div>

          <div className="flex justify-center gap-2 pt-1">
            <button
              onClick={() => updateModelTransform(model.id, { isPaused: true })}
              className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
              title="Pause"
            >
              ⏸
            </button>
            <button
              onClick={() => updateModelTransform(model.id, { isPaused: false })}
              className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
              title="Resume"
            >
              ▶
            </button>
            <button
              onClick={() => onPlayAnimation?.(model.id)}
              className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
              title="Restart"
            >
              ⏮
            </button>
          </div>

          <label className="flex items-center gap-2 text-sm pt-1">
            <input
              type="checkbox"
              checked={model.autoplay || false}
              onChange={(e) =>
                updateModelTransform(model.id, { autoplay: e.target.checked })
              }
            />
            Autoplay on Publish
          </label>
        </div>
      )}
    </div>
  );
}
