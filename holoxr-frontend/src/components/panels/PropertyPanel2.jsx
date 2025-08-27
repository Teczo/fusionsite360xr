// PropertyPanel.jsx
// NOTE: adjust the import path for upsertObjectAnimation to match your tree.
// If this file lives beside studioLogic.jsx, use './studioLogic.jsx'
// If it's in a sibling folder, use '../Studio/studioLogic' (no extension if your bundler resolves it).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { upsertObjectAnimation } from './studioLogic.jsx'; // <-- CHANGE IF NEEDED

export default function PropertyPanel({
    model,
    models,
    updateModelTransform,
    updateTextProperty,
    onPlayAnimation,
    updateModelProps,
    onStartAnchorPick,
    projectId,                  // required for saving behaviors
    objectBehaviors = [],       // current behaviors from animByObject[model.id]?.behaviors
    onBehaviorsSaved,           // (id, savedDoc) => void
}) {
    // -------------------- helpers shared by sections --------------------
    const parseNumber = (v, def = 0) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : def;
    };

    const handleChange = (field, value) => {
        const parsed = parseFloat(value);
        if (!isNaN(parsed) && model?.id) {
            updateModelTransform(model.id, { [field]: parsed });
        }
    };

    // Only used for 3D Text items
    const handleTextPropertyChange = (field, value) => {
        if (model?.id) updateTextProperty(model.id, { [field]: value });
    };

    const setProp = (key, value) => {
        if (model?.id) updateModelProps(model.id, { [key]: value });
    };
    const setAppearance = (key, value) =>
        model?.id &&
        updateModelProps(model.id, { appearance: { ...(model.appearance || {}), [key]: value } });

    // -------------------- Animation (Behaviors) Editor --------------------
    const emptyRotateSelf = () => ({
        type: 'rotateSelf',
        enabled: true,
        axis: [0, 1, 0],
        degreesPerSecond: 45,
        loop: true,
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
        loop: true,
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
        loop: true,
        closed: false,
        easing: 'linear',
        startDelayMs: 0,
    });

    const selectableObjects = useMemo(
        () => (models || []).filter((m) => m.type === 'model' && m.id !== model?.id),
        [models, model?.id]
    );

    // Local draft so creators can edit, then Save. Sync from props by *value*, not identity.
    const [behaviorsDraft, setBehaviorsDraft] = useState(objectBehaviors || []);
    const lastBehaviorsJsonRef = useRef(null);
    useEffect(() => {
        const json = JSON.stringify(objectBehaviors || []);
        if (lastBehaviorsJsonRef.current !== json) {
            lastBehaviorsJsonRef.current = json;
            setBehaviorsDraft(objectBehaviors || []);
        }
    }, [objectBehaviors, model?.id]);

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
            kind === 'rotateSelf' ? emptyRotateSelf() : kind === 'orbit' ? emptyOrbit() : emptyTranslatePath(),
        ]);
    };

    // Save to backend via /api/animations (upsert)
    const [saving, setSaving] = useState(false);
    const [saveMsg, setSaveMsg] = useState('');
    const handleSaveBehaviors = async () => {
        try {
            setSaveMsg('');
            if (!projectId) {
                setSaveMsg('Missing projectId');
                console.warn('[Behaviors] Save aborted: missing projectId');
                return;
            }
            if (!model?.id) {
                setSaveMsg('No object selected');
                console.warn('[Behaviors] Save aborted: no model.id');
                return;
            }

            setSaving(true);
            const payload = {
                enabled: true,
                version: Date.now(), // bump client-side; server can coerce
                behaviors: behaviorsDraft,
            };
            console.log('[Behaviors] Upsert →', { projectId, objectId: model.id, payload });

            const saved = await upsertObjectAnimation(projectId, model.id, payload);

            setSaving(false);

            if (!saved) {
                setSaveMsg('Save failed');
                console.error('[Behaviors] Upsert failed: no JSON returned (check network / 401 / CORS)');
                return;
            }

            setSaveMsg('Saved ✓');
            console.log('[Behaviors] Upsert OK ←', saved);
            onBehaviorsSaved?.(model.id, saved); // parent updates animByObject map
        } catch (err) {
            setSaving(false);
            setSaveMsg('Save error');
            console.error('[Behaviors] Save threw:', err);
        }
    };

    // -------------------- SAFE GUARD: render shell if no model --------------------
    const transform = model?.transform || {};
    if (!model) {
        return (
            <div className="absolute top-20 bottom-4 right-4 w-72 bg-black/30 backdrop-blur-lg border border-white/10 shadow-xl rounded-3xl p-5 z-10 overflow-y-auto text-white space-y-4">
                <h2 className="text-m font-semibold">Properties</h2>
                <p className="text-xs text-gray-400">Select an object to edit its properties.</p>
            </div>
        );
    }

    // -------------------- FULL PANEL --------------------
    return (
        <div className="absolute top-20 bottom-4 right-4 w-72 bg-black/30 backdrop-blur-lg border border-white/10 shadow-xl rounded-3xl p-5 z-10 overflow-y-auto text-white space-y-4">
            <h2 className="text-m font-semibold">Properties</h2>

            {/* Transform */}
            {[
                { label: 'Position', keys: ['x', 'y', 'z'], def: 0 },
                { label: 'Rotation', keys: ['rx', 'ry', 'rz'], def: 0 },
                { label: 'Scale', keys: ['sx', 'sy', 'sz'], def: 1 },
            ].map(({ label, keys, def }) => (
                <div key={label}>
                    <label className="block text-sm font-medium mb-1">{label}</label>
                    <div className="flex gap-2">
                        {keys.map((axis) => (
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
                            className="w-full rounded-md h-8 p-1 border border-gray-600 bg-[#2a2b2f]"
                        />
                    </div>
                </div>
            )}

            {/* Button Properties (abbrev; unchanged) */}
            {model.type === 'button' && (
                <div className="space-y-3 pt-2 border-t border-gray-700">
                    {/* ... keep your existing button editor here ... */}
                </div>
            )}

            {/* Label / Quiz sections ... (unchanged from your current file) */}

            {/* Animation Controls for GLTF clips */}
            {model.type === 'model' && model.animations?.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-gray-700">
                    <div>
                        <label className="block text-sm font-medium mb-1">Animations</label>
                        <select
                            value={model.selectedAnimationIndex || 0}
                            onChange={(e) =>
                                updateModelTransform(model.id, {
                                    selectedAnimationIndex: parseInt(e.target.value),
                                    playAnimationKey: Date.now(),
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
                            onChange={(e) => updateModelTransform(model.id, { autoplay: e.target.checked })}
                        />
                        Autoplay on Publish
                    </label>
                </div>
            )}

            {/* Backend Behaviors (rotateSelf / orbit / translatePath) */}
            {model.type === 'model' && (
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

                    {behaviorsDraft.length === 0 && <p className="text-xs text-gray-400">No behaviors yet. Add one above.</p>}

                    {behaviorsDraft.map((b, idx) => (
                        <div key={idx} className="rounded-lg border border-gray-700 p-3 space-y-2 bg-[#202228]">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs uppercase tracking-wide text-gray-300">{b.type}</span>
                                    <label className="flex items-center gap-1 text-xs">
                                        <input
                                            type="checkbox"
                                            checked={b.enabled !== false}
                                            onChange={(e) => updateBehavior(idx, { enabled: e.target.checked })}
                                        />
                                        enabled
                                    </label>
                                </div>
                                <button onClick={() => removeBehavior(idx)} className="text-xs bg-red-600 hover:bg-red-700 px-2 py-1 rounded">
                                    Delete
                                </button>
                            </div>

                            {/* Common: startDelayMs */}
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs text-gray-400 mb-1">startDelayMs</label>
                                    <input
                                        type="number"
                                        value={b.startDelayMs ?? 0}
                                        onChange={(e) => updateBehavior(idx, { startDelayMs: Math.max(0, parseNumber(e.target.value, 0)) })}
                                        className="w-full rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600"
                                    />
                                </div>
                                {b.type !== 'translatePath' && (
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1">loop</label>
                                        <select
                                            value={b.loop ? 'true' : 'false'}
                                            onChange={(e) => updateBehavior(idx, { loop: e.target.value === 'true' })}
                                            className="w-full rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600"
                                        >
                                            <option value="true">true</option>
                                            <option value="false">false</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* Type specific */}
                            {b.type === 'rotateSelf' && (
                                <div className="space-y-2">
                                    <div className="grid grid-cols-3 gap-2">
                                        {['x', 'y', 'z'].map((axis, aIdx) => (
                                            <div key={axis}>
                                                <label className="block text-xs text-gray-400 mb-1">axis {axis}</label>
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
                                            <label className="block text-xs text-gray-400 mb-1">degreesPerSecond</label>
                                            <input
                                                type="number"
                                                value={b.degreesPerSecond ?? 0}
                                                onChange={(e) => updateBehavior(idx, { degreesPerSecond: parseNumber(e.target.value, 0) })}
                                                className="w-full rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {b.type === 'orbit' && (
                                <div className="space-y-2">
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1">targetObjectId</label>
                                        <select
                                            value={b.targetObjectId || ''}
                                            onChange={(e) => updateBehavior(idx, { targetObjectId: e.target.value })}
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
                                                <label className="block text-xs text-gray-400 mb-1">axis {axis}</label>
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
                                            <label className="block text-xs text-gray-400 mb-1">degreesPerSecond</label>
                                            <input
                                                type="number"
                                                value={b.degreesPerSecond ?? 0}
                                                onChange={(e) => updateBehavior(idx, { degreesPerSecond: parseNumber(e.target.value, 0) })}
                                                className="w-full rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">radius</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={b.radius ?? 0}
                                                onChange={(e) => updateBehavior(idx, { radius: Math.max(0, parseNumber(e.target.value, 0)) })}
                                                className="w-full rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">initialAngleDeg</label>
                                            <input
                                                type="number"
                                                value={b.initialAngleDeg ?? 0}
                                                onChange={(e) => updateBehavior(idx, { initialAngleDeg: parseNumber(e.target.value, 0) })}
                                                className="w-full rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {b.type === 'translatePath' && (
                                <div className="space-y-2">
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1">points (one [x,y,z] per line)</label>
                                        <textarea
                                            rows={3}
                                            value={(b.points || []).map((p) => `[${p[0]}, ${p[1]}, ${p[2]}]`).join('\n')}
                                            onChange={(e) => {
                                                const lines = e.target.value.split('\n');
                                                const pts = [];
                                                for (const line of lines) {
                                                    try {
                                                        const arr = JSON.parse(line.replace(/(\d)\s*,\s*(\d)/g, '$1, $2'));
                                                        if (Array.isArray(arr) && arr.length === 3) {
                                                            pts.push([parseNumber(arr[0], 0), parseNumber(arr[1], 0), parseNumber(arr[2], 0)]);
                                                        }
                                                    } catch { }
                                                }
                                                if (pts.length >= 2) updateBehavior(idx, { points: pts });
                                            }}
                                            className="w-full rounded-md bg-[#2a2b2f] text-white p-2 text-xs border border-gray-600 font-mono"
                                        />
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">durationMs</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={b.durationMs ?? 1000}
                                                onChange={(e) => updateBehavior(idx, { durationMs: Math.max(1, parseNumber(e.target.value, 1000)) })}
                                                className="w-full rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">easing</label>
                                            <select
                                                value={b.easing || 'linear'}
                                                onChange={(e) => updateBehavior(idx, { easing: e.target.value })}
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
                                                    onChange={(e) => updateBehavior(idx, { closed: e.target.checked })}
                                                />
                                                closed
                                            </label>
                                            <label className="text-xs flex items-center gap-1">
                                                <input
                                                    type="checkbox"
                                                    checked={!!b.loop}
                                                    onChange={(e) => updateBehavior(idx, { loop: e.target.checked })}
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
                            onClick={handleSaveBehaviors}
                            disabled={saving}
                            className="flex-1 text-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white py-1.5 rounded-md"
                        >
                            {saving ? 'Saving…' : 'Save Behaviors'}
                        </button>
                        <button
                            onClick={() => setBehaviorsDraft(objectBehaviors || [])}
                            disabled={saving}
                            className="text-sm bg-[#2a2b2f] hover:bg-[#33353e] border border-gray-700 text-white px-3 py-1.5 rounded-md"
                        >
                            Revert
                        </button>
                        {saveMsg && <span className="text-xs text-gray-400">{saveMsg}</span>}
                    </div>
                </div>
            )}
        </div>
    );
}
