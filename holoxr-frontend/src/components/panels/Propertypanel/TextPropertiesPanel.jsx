import React from 'react';

export default function TextPropertiesPanel({ model, onChange }) {
    return (
        <div className="space-y-3 pt-2 border-t border-gray-700">
            <div>
                <label className="block text-sm font-medium mb-1">Text</label>
                <input
                    type="text"
                    value={model.content || ''}
                    onChange={(e) => onChange('content', e.target.value)}
                    className="w-full rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600"
                />
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">Font Size</label>
                <input
                    type="number"
                    value={model.fontSize || 1}
                    onChange={(e) => onChange('fontSize', e.target.value)}
                    className="w-full rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600"
                />
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">Color</label>
                <input
                    type="color"
                    value={model.color || '#ffffff'}
                    onChange={(e) => onChange('color', e.target.value)}
                    className="w-full rounded-md h-8 p-1 border border-gray-600 bg-[#2a2b2f]"
                />
            </div>
        </div>
    );
}
