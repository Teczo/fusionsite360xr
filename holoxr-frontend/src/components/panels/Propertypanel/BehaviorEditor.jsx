import React, { useEffect, useMemo, useRef, useState } from 'react';

export default function BehaviorEditor({
    modelId,
    behaviors = [],
    models = [],
    onSave,
    onBehaviorsSaved,
}) {

    const emptyRotateSelf = () => ({
        type: 'rotateSelf',
        enabled: true,
        axis: [0, 1, 0],
        degreesPerSecond: 45,
        // NEW
        playbackMode: 'loop',   // 'loop' | 'once' | 'pingpong'
        holdMs: 0,
        maxAngleDeg: 0,         // 0 disables pingpong bounds; needed for 'once'/'pingpong'
        startDelayMs: 0,
    });

    const emptyOrbit = () => ({
        type: 'orbit',
        enabled: true,
        targetObjectId: '',
        axis: [0, 1, 0],
        degreesPerSecond: 30,
        radius: 1.5,
        initialAngleDeg: 0,
        // NEW
        endAngleDeg: 180,       // used by 'once'/'pingpong'
        playbackMode: 'loop',
        holdMs: 0,
        startDelayMs: 0,
    });

    const emptyTranslatePath = () => ({
        type: 'translatePath',
        enabled: true,
        points: [
            [0, 0, 0],
            [1, 0, 0],
        ],
        durationMs: 3000,
        easing: 'linear',
        // keep existing flags for back-compat, but prefer playbackMode if set
        loop: true,
        closed: false,
        // NEW
        playbackMode: 'loop',
        holdMs: 0,
        startDelayMs: 0,
    });

    const selectableObjects = useMemo(
        () => (models || []).filter((m) => m.type === 'model' && m.id !== modelId),
        [models, modelId]
    );

    const [behaviorsDraft, setBehaviorsDraft] = useState(behaviors || []);
    const lastBehaviorsJsonRef = useRef(null);

    useEffect(() => {
        const json = JSON.stringify(behaviors || []);
        if (lastBehaviorsJsonRef.current !== json) {
            lastBehaviorsJsonRef.current = json;
            setBehaviorsDraft(behaviors || []);
        }
    }, [behaviors, modelId]);

    const updateBehavior = (idx, patch) => {
        setBehaviorsDraft((prev) => {
            const next = [...prev];
            next[idx] = { ...next[idx], ...patch };
            return next;
        });
    };
    const removeBehavior = (idx) => {
        setBehaviorsDraft((prev) => prev.filter((_, i) => i !== idx));
    };
    const addBehavior = (kind) => {
        setBehaviorsDraft((prev) => [
            ...prev,
            kind === 'rotateSelf'
                ? emptyRotateSelf()
                : kind === 'orbit'
                    ? emptyOrbit()
                    : emptyTranslatePath(),
        ]);
    };
    const parseNumber = (v, def = 0) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : def;
    };

    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState('');
    const handleSave = async () => {
        if (!modelId) return;
        setSaving(true);
        setSaveMsg('');
        const saved = await onSave?.(modelId, behaviorsDraft);
        setSaving(false);
        if (saved) {
            setSaveMsg('Saved ✓');
            onBehaviorsSaved?.(modelId, saved);
        } else {
            setSaveMsg('Save failed');
        }
    };



    return (
        <div className="space-y-3 pt-3 border-t border-gray-700">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Behaviors</h3>
                <div className="flex gap-2">
                    <button
                        onClick={() => addBehavior('rotateSelf')}
                        className="text-xs bg-[#2a2b2f] hover:bg-[#33353e] px-2 py-1 rounded border border-gray-700"
                    >
                        + RotateSelf
                    </button>
                    <button
                        onClick={() => addBehavior('orbit')}
                        className="text-xs bg-[#2a2b2f] hover:bg-[#33353e] px-2 py-1 rounded border border-gray-700"
                    >
                        + Orbit
                    </button>
                    <button
                        onClick={() => addBehavior('translatePath')}
                        className="text-xs bg-[#2a2b2f] hover:bg-[#33353e] px-2 py-1 rounded border border-gray-700"
                    >
                        + TranslatePath
                    </button>
                </div>
            </div>

            {behaviorsDraft.length === 0 && (
                <p className="text-xs text-gray-400">No behaviors yet. Add one above.</p>
            )}

            {behaviorsDraft.map((b, idx) => (
                <div
                    key={idx}
                    className="rounded-lg border border-gray-700 p-3 space-y-2 bg-[#202228]"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-xs uppercase tracking-wide text-gray-300">
                                {b.type}
                            </span>
                            <label className="flex items-center gap-1 text-xs">
                                <input
                                    type="checkbox"
                                    checked={b.enabled !== false}
                                    onChange={(e) =>
                                        updateBehavior(idx, { enabled: e.target.checked })
                                    }
                                />
                                enabled
                            </label>
                        </div>
                        <button
                            onClick={() => removeBehavior(idx)}
                            className="text-xs bg-red-600 hover:bg-red-700 px-2 py-1 rounded"
                        >
                            Delete
                        </button>
                    </div>

                    {/* Common: startDelayMs + playback */}
                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">startDelayMs</label>
                            <input
                                type="number"
                                value={b.startDelayMs ?? 0}
                                onChange={(e) => updateBehavior(idx, {
                                    startDelayMs: Math.max(0, parseNumber(e.target.value, 0)),
                                })}
                                className="w-full rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600"
                            />
                        </div>

                        <div>
                            <label className="block text-xs text-gray-400 mb-1">playbackMode</label>
                            <select
                                value={b.playbackMode || (b.loop ? 'loop' : 'once')}
                                onChange={(e) => updateBehavior(idx, { playbackMode: e.target.value })}
                                className="w-full rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600"
                            >
                                <option value="loop">loop</option>
                                <option value="once">once</option>
                                <option value="pingpong">pingpong</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs text-gray-400 mb-1">holdMs (at ends)</label>
                            <input
                                type="number"
                                value={b.holdMs ?? 0}
                                onChange={(e) => updateBehavior(idx, { holdMs: Math.max(0, parseNumber(e.target.value, 0)) })}
                                className="w-full rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600"
                            />
                        </div>
                    </div>


                    {/* Type-specific fields */}
                    {b.type === 'rotateSelf' && (
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 gap-2">
                                {['x', 'y', 'z'].map((axis, aIdx) => (
                                    <div key={axis}>
                                        <label className="block text-xs text-gray-400 mb-1">
                                            axis {axis}
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={b.axis?.[aIdx] ?? (aIdx === 1 ? 1 : 0)}
                                            onChange={(e) => {
                                                const v = parseNumber(e.target.value, 0);
                                                const axisArr = [...(b.axis || [0, 1, 0])];
                                                axisArr[aIdx] = v;
                                                updateBehavior(idx, { axis: axisArr });
                                            }}
                                            className="w-full rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600"
                                        />
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">maxAngleDeg</label>
                                    <input
                                        type="number"
                                        value={b.maxAngleDeg ?? 0}
                                        onChange={(e) => updateBehavior(idx, { maxAngleDeg: Math.max(0, parseNumber(e.target.value, 0)) })}
                                        className="w-full rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600"
                                    />
                                    <p className="text-[10px] text-gray-500 mt-1">
                                        Used when playbackMode is <em>once</em> or <em>pingpong</em>.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {b.type === 'orbit' && (
                        <div className="space-y-2">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">
                                    targetObjectId
                                </label>
                                <select
                                    value={b.targetObjectId || ''}
                                    onChange={(e) =>
                                        updateBehavior(idx, { targetObjectId: e.target.value })
                                    }
                                    className="w-full rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600"
                                >
                                    <option value="">— Select object —</option>
                                    {selectableObjects.map((o) => (
                                        <option key={o.id} value={o.id}>
                                            {o.name || o.id}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {['x', 'y', 'z'].map((axis, aIdx) => (
                                    <div key={axis}>
                                        <label className="block text-xs text-gray-400 mb-1">
                                            axis {axis}
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={b.axis?.[aIdx] ?? (aIdx === 1 ? 1 : 0)}
                                            onChange={(e) => {
                                                const v = parseNumber(e.target.value, 0);
                                                const axisArr = [...(b.axis || [0, 1, 0])];
                                                axisArr[aIdx] = v;
                                                updateBehavior(idx, { axis: axisArr });
                                            }}
                                            className="w-full rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600"
                                        />
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">
                                        degreesPerSecond
                                    </label>
                                    <input
                                        type="number"
                                        value={b.degreesPerSecond ?? 0}
                                        onChange={(e) =>
                                            updateBehavior(idx, {
                                                degreesPerSecond: parseNumber(e.target.value, 0),
                                            })
                                        }
                                        className="w-full rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">
                                        radius
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={b.radius ?? 0}
                                        onChange={(e) =>
                                            updateBehavior(idx, {
                                                radius: Math.max(0, parseNumber(e.target.value, 0)),
                                            })
                                        }
                                        className="w-full rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">
                                        initialAngleDeg
                                    </label>
                                    <input
                                        type="number"
                                        value={b.initialAngleDeg ?? 0}
                                        onChange={(e) =>
                                            updateBehavior(idx, {
                                                initialAngleDeg: parseNumber(e.target.value, 0),
                                            })
                                        }
                                        className="w-full rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">endAngleDeg</label>
                                    <input
                                        type="number"
                                        value={b.endAngleDeg ?? 180}
                                        onChange={(e) => updateBehavior(idx, { endAngleDeg: parseNumber(e.target.value, 180) })}
                                        className="w-full rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {b.type === 'translatePath' && (
                        <div className="space-y-2">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">
                                    points (one [x,y,z] per line)
                                </label>
                                <textarea
                                    rows={3}
                                    value={(b.points || [])
                                        .map((p) => `[${p[0]}, ${p[1]}, ${p[2]}]`)
                                        .join('\\n')}
                                    onChange={(e) => {
                                        const lines = e.target.value.split('\\n');
                                        const pts = [];
                                        for (const line of lines) {
                                            try {
                                                const arr = JSON.parse(
                                                    line.replace(/(\d)\s*,\s*(\d)/g, '$1, $2')
                                                );
                                                if (Array.isArray(arr) && arr.length === 3) {
                                                    pts.push([
                                                        parseNumber(arr[0], 0),
                                                        parseNumber(arr[1], 0),
                                                        parseNumber(arr[2], 0),
                                                    ]);
                                                }
                                            } catch {
                                                // ignore parse errors
                                            }
                                        }
                                        if (pts.length >= 2) updateBehavior(idx, { points: pts });
                                    }}
                                    className="w-full rounded-md bg-[#2a2b2f] text-white p-2 text-xs border border-gray-600 font-mono"
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">
                                        durationMs
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={b.durationMs ?? 1000}
                                        onChange={(e) =>
                                            updateBehavior(idx, {
                                                durationMs: Math.max(
                                                    1,
                                                    parseNumber(e.target.value, 1000)
                                                ),
                                            })
                                        }
                                        className="w-full rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">
                                        easing
                                    </label>
                                    <select
                                        value={b.easing || 'linear'}
                                        onChange={(e) =>
                                            updateBehavior(idx, { easing: e.target.value })
                                        }
                                        className="w-full rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600"
                                    >
                                        <option value="linear">linear</option>
                                        <option value="easeIn">easeIn</option>
                                        <option value="easeOut">easeOut</option>
                                        <option value="easeInOut">easeInOut</option>
                                    </select>
                                </div>
                                <div className="flex items-end gap-2">
                                    <label className="text-xs flex items-center gap-1">
                                        <input
                                            type="checkbox"
                                            checked={!!b.closed}
                                            onChange={(e) =>
                                                updateBehavior(idx, { closed: e.target.checked })
                                            }
                                        />
                                        closed
                                    </label>
                                    <label className="text-xs flex items-center gap-1">
                                        <input
                                            type="checkbox"
                                            checked={!!b.loop}
                                            onChange={(e) =>
                                                updateBehavior(idx, { loop: e.target.checked })
                                            }
                                        />
                                        loop
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ))}

            <div className="flex items-center gap-2">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 text-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white py-1.5 rounded-md"
                >
                    {saving ? 'Saving…' : 'Save Behaviors'}
                </button>
                <button
                    onClick={() => setBehaviorsDraft(behaviors || [])}
                    disabled={saving}
                    className="text-sm bg-[#2a2b2f] hover:bg-[#33353e] border border-gray-700 text-white px-3 py-1.5 rounded-md"
                >
                    Revert
                </button>
                {saveMsg && <span className="text-xs text-gray-400">{saveMsg}</span>}
            </div>
        </div>
    );
}