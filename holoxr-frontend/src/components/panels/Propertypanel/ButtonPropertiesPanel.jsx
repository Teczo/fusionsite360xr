import React from 'react';

export default function ButtonPropertiesPanel({ model, models, updateModelProps }) {
    return (
        <div className="space-y-3 pt-2 border-t border-gray-700">
            <div>
                <label className="block text-sm font-medium mb-1">Label</label>
                <input
                    type="text"
                    value={model.appearance?.label || 'Tap'}
                    onChange={(e) =>
                        updateModelProps(model.id, {
                            appearance: { ...(model.appearance || {}), label: e.target.value }
                        })
                    }
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
                        updateModelProps(model.id, {
                            interactions: [{
                                ...current,
                                type: current.type || 'toggleVisibility',
                                targetId: e.target.value,
                            }],
                        });
                    }}
                    className="w-full rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600"
                >
                    <option value="">— Select object —</option>
                    {(models || [])
                        .filter(m => m.id !== model.id && m.type !== 'button')
                        .map(m => (
                            <option key={m.id} value={m.id}>{m.name || m.id}</option>
                        ))}
                </select>
            </div>
        </div>
    );
}

