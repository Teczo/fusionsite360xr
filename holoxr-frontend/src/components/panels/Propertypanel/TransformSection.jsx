import React from 'react';

export default function TransformSection({ transform, onChange }) {
    const fields = [
        { label: 'Position', keys: ['x', 'y', 'z'], def: 0 },
        { label: 'Rotation', keys: ['rx', 'ry', 'rz'], def: 0 },
        { label: 'Scale', keys: ['sx', 'sy', 'sz'], def: 1 }
    ];

    return (
        <>
            {fields.map(({ label, keys, def }) => (
                <div key={label}>
                    <label className="block text-sm font-medium mb-1">{label}</label>
                    <div className="flex gap-2">
                        {keys.map(axis => (
                            <input
                                key={axis}
                                type="number"
                                value={transform[axis] ?? def}
                                onChange={(e) => onChange(axis, e.target.value)}
                                className="w-1/3 rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        ))}
                    </div>
                </div>
            ))}
        </>
    );
}

