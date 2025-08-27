import React from 'react';

export default function LabelPropertiesPanel({ model, models, updateModelProps, onStartAnchorPick }) {
    if (!model) return null;

    return (
        <div className="space-y-3 pt-2 border-t border-gray-700">
            <div>
                <label className="block text-sm font-medium mb-1">Text</label>
                <input
                    type="text"
                    value={model.content ?? 'New Label'}
                    onChange={(e) => updateModelProps(model.id, { content: e.target.value })}
                    className="w-full rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600"
                />
            </div>

            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="block text-sm font-medium mb-1">Font Size</label>
                    <input
                        type="number"
                        min="0.05"
                        step="0.05"
                        value={model.fontSize ?? 0.35}
                        onChange={(e) =>
                            updateModelProps(model.id, { fontSize: parseFloat(e.target.value) || 0.35 })
                        }
                        className="w-full rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Text Color</label>
                    <input
                        type="color"
                        value={model.color ?? '#ffffff'}
                        onChange={(e) => updateModelProps(model.id, { color: e.target.value })}
                        className="w-full rounded-md h-8 p-1 border border-gray-600 bg-[#2a2b2f]"
                    />
                </div>
            </div>

            <div className="pt-2 border-t border-gray-700">
                <label className="block text-sm font-medium mb-1">Label Line</label>
                <div className="grid grid-cols-3 gap-2">
                    {['none', 'toObject', 'toPoint'].map(mode => (
                        <button
                            key={mode}
                            onClick={() => updateModelProps(model.id, { lineMode: mode })}
                            className={`text-sm rounded-md py-1.5 border ${model.lineMode === mode
                                ? 'bg-blue-600 border-blue-500'
                                : 'bg-[#2a2b2f] border-gray-700 hover:bg[#32343d]'
                                }`}
                        >
                            {mode === 'none' ? 'None' : mode === 'toObject' ? 'To Object' : 'To Point'}
                        </button>
                    ))}
                </div>
            </div>

            {model.lineMode === 'toObject' && (
                <div className="space-y-2">
                    <div>
                        <label className="block text-sm font-medium mb-1">Target Object</label>
                        <select
                            value={model.targetId ?? ''}
                            onChange={(e) => updateModelProps(model.id, { targetId: e.target.value || null })}
                            className="w-full rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600"
                        >
                            <option value="">— Select object —</option>
                            {(models || []).filter(m => m.id !== model.id).map(m => (
                                <option key={m.id} value={m.id}>{m.name || m.id}</option>
                            ))}
                        </select>
                    </div>
                    <p className="text-xs text-gray-400">The line will attach to the label’s nearest edge toward the target.</p>
                </div>
            )}

            {model.lineMode === 'toPoint' && (
                <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                        {['x', 'y', 'z'].map(axis => (
                            <div key={axis}>
                                <label className="block text-xs text-gray-400 mb-1 uppercase">{axis}</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={model.anchorPoint?.[axis] ?? 0}
                                    onChange={(e) => {
                                        const v = parseFloat(e.target.value) || 0;
                                        const ap = { ...(model.anchorPoint || { x: 0, y: 0, z: 0 }), [axis]: v };
                                        updateModelProps(model.id, { anchorPoint: ap });
                                    }}
                                    className="w-full rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600"
                                />
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => onStartAnchorPick?.(model.id)}
                            className="flex-1 text-sm bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded-md"
                        >
                            Pick in Scene
                        </button>
                        <button
                            onClick={() => updateModelProps(model.id, { anchorPoint: { x: 0, y: 0, z: 0 } })}
                            className="flex-1 text-sm bg-[#2a2b2f] hover:bg-[#33353e] border border-gray-700 text-white py-1.5 rounded-md"
                        >
                            Reset
                        </button>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={!!model.appearance?.billboard}
                            onChange={(e) => updateModelProps(model.id, {
                                appearance: { ...(model.appearance || {}), billboard: e.target.checked }
                            })}
                        />
                        Billboard toward camera
                    </label>
                </div>
            )}

            <div className="pt-2 border-t border-gray-700 space-y-3">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Background</label>
                    <input
                        type="color"
                        value={model.appearance?.bg ?? '#111827'}
                        onChange={(e) => updateModelProps(model.id, {
                            appearance: { ...(model.appearance || {}), bg: e.target.value }
                        })}
                        className="h-8 w-14 rounded-md border border-gray-600 bg-[#2a2b2f]"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Line Width</label>
                    <input
                        type="number"
                        min="1"
                        step="1"
                        value={model.appearance?.lineWidth ?? 2}
                        onChange={(e) => updateModelProps(model.id, {
                            appearance: {
                                ...(model.appearance || {}),
                                lineWidth: Math.max(1, parseInt(e.target.value) || 1)
                            }
                        })}
                        className="w-full rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Padding (X / Y)</label>
                    <div className="flex gap-2">
                        <input
                            type="number"
                            step="0.05"
                            value={(model.appearance?.padding?.[0] ?? 0.3)}
                            onChange={(e) => {
                                const px = parseFloat(e.target.value) || 0.3;
                                const p = [px, model.appearance?.padding?.[1] ?? 0.15];
                                updateModelProps(model.id, {
                                    appearance: { ...(model.appearance || {}), padding: p }
                                });
                            }}
                            className="w-1/2 rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600"
                        />
                        <input
                            type="number"
                            step="0.05"
                            value={(model.appearance?.padding?.[1] ?? 0.15)}
                            onChange={(e) => {
                                const py = parseFloat(e.target.value) || 0.15;
                                const p = [model.appearance?.padding?.[0] ?? 0.3, py];
                                updateModelProps(model.id, {
                                    appearance: { ...(model.appearance || {}), padding: p }
                                });
                            }}
                            className="w-1/2 rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}