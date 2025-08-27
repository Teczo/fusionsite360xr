import React from 'react';

export default function ModelAnimationControls({ model, updateModelTransform, onPlayAnimation }) {
    if (model?.type !== 'model' || !model.animations?.length) return null;

    return (
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
    );
}