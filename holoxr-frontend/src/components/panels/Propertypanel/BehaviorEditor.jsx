import React, { useEffect, useMemo, useRef, useState } from 'react';

export default function BehaviorEditor({
    modelId,
    behaviors = [],
    models = [],
    onSave,
    onBehaviorsSaved,
}) {
    // ----- Defaults -----
    const emptyRotateSelf = () => ({
        type: 'rotateSelf',
        enabled: true,
        axis: [0, 1, 0],
        degreesPerSecond: 45,
        playbackMode: 'loop', // 'loop' | 'once' | 'pingpong'
        holdMs: 0,
        maxAngleDeg: 0,
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
        endAngleDeg: 180,
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
        loop: true,
        closed: false,
        playbackMode: 'loop',
        holdMs: 0,
        startDelayMs: 0,
    });

    // ----- Derived options -----
    const selectableObjects = useMemo(
        () => (models || []).filter((m) => m.type === 'model' && m.id !== modelId),
        [models, modelId]
    );

    // ----- Local state -----
    const [behaviorsDraft, setBehaviorsDraft] = useState(behaviors || []);
    const originalRef = useRef(behaviors || []);
    const lastBehaviorsJsonRef = useRef(null);

    useEffect(() => {
        const json = JSON.stringify(behaviors || []);
        if (lastBehaviorsJsonRef.current !== json) {
            lastBehaviorsJsonRef.current = json;
            originalRef.current = behaviors || [];
            setBehaviorsDraft(behaviors || []);
        }
    }, [behaviors, modelId]);

    // ----- Helpers -----
    const parseNumber = (v, def = 0) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : def;
    };

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

    const revertBehavior = (idx) => {
        const orig = originalRef.current?.[idx];
        if (!orig) return;
        setBehaviorsDraft((prev) => {
            const next = [...prev];
            next[idx] = JSON.parse(JSON.stringify(orig));
            return next;
        });
    };

    // Per-item saving UX
    const [savingIdx, setSavingIdx] = useState(null);
    const [saveMsgs, setSaveMsgs] = useState({});
    const setItemMsg = (idx, msg) => setSaveMsgs((m) => ({ ...m, [idx]: msg }));

    const handleSaveItem = async (idx) => {
        if (!modelId) return;
        setSavingIdx(idx);
        setItemMsg(idx, '');
        const saved = await onSave?.(modelId, behaviorsDraft);
        setSavingIdx(null);
        if (saved) {
            setItemMsg(idx, 'Saved ✓');
            originalRef.current = behaviorsDraft; // accept all current as source-of-truth
            onBehaviorsSaved?.(modelId, saved);
        } else {
            setItemMsg(idx, 'Save failed');
        }
    };

    // ----- UI -----
    const [newKind, setNewKind] = useState('rotateSelf');

    return (
        <div className="space-y-3 pt-3 border-t border-gray-700">
            {/* Header row with dropdown adder */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Behaviors</h3>
                <div className="flex items-center gap-2">
                    <select
                        value={newKind}
                        onChange={(e) => setNewKind(e.target.value)}
                        className="h-8 rounded-md bg-[#2a2b2f] text-white text-xs px-2 border border-gray-700"
                    >
                        <option value="rotateSelf">RotateSelf</option>
                        <option value="orbit">Orbit</option>
                        <option value="translatePath">TranslatePath</option>
                    </select>
                    <button
                        onClick={() => addBehavior(newKind)}
                        className="h-8 px-3 text-xs rounded-md bg-emerald-600 hover:bg-emerald-500 text-white"
                    >
                        + Add
                    </button>
                </div>
            </div>

            {behaviorsDraft.length === 0 && (
                <p className="text-xs text-gray-400">No behaviors yet. Add one above.</p>
            )}

            {behaviorsDraft.map((b, idx) => (
                <div
                    key={idx}
                    className="rounded-2xl border border-white/10 p-3 space-y-3 bg-black/20 backdrop-blur-sm shadow-sm"
                >
                    {/* Card header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] uppercase tracking-wide text-gray-300 bg-white/5 px-2 py-1 rounded-md">
                                {b.type}
                            </span>
                            <label className="flex items-center gap-1 text-xs">
                                <input
                                    type="checkbox"
                                    checked={b.enabled !== false}
                                    onChange={(e) => updateBehavior(idx, { enabled: e.target.checked })}
                                />
                                enabled
                            </label>
                        </div>
                        <div className="flex items-center gap-1">
                            {/* Revert (icon) */}
                            <IconButton
                                title="Revert"
                                onClick={() => revertBehavior(idx)}
                                icon={IconUndo}
                            />
                            {/* Save (icon) */}
                            <IconButton
                                title={savingIdx === idx ? 'Saving…' : 'Save'}
                                onClick={() => handleSaveItem(idx)}
                                disabled={savingIdx === idx}
                                icon={savingIdx === idx ? IconSpinner : IconSave}
                            />
                            {/* Delete (icon) */}
                            <IconButton
                                title="Delete"
                                onClick={() => removeBehavior(idx)}
                                intent="danger"
                                icon={IconTrash}
                            />
                        </div>
                    </div>

                    {saveMsgs[idx] && (
                        <div className="text-[11px] text-gray-400">{saveMsgs[idx]}</div>
                    )}

                    {/* Common fields — modern compact grid */}
                    <div className="grid grid-cols-3 gap-2">
                        <Field label="Start delay" suffix="ms">
                            <input
                                type="number"
                                value={b.startDelayMs ?? 0}
                                onChange={(e) =>
                                    updateBehavior(idx, { startDelayMs: Math.max(0, parseNumber(e.target.value, 0)) })
                                }
                                className="w-full rounded-lg bg-[#1f2229] text-white p-2 text-xs border border-white/10"
                            />
                        </Field>

                        <Field label="Playback">
                            <select
                                value={b.playbackMode || (b.loop ? 'loop' : 'once')}
                                onChange={(e) => updateBehavior(idx, { playbackMode: e.target.value })}
                                className="w-full rounded-lg bg-[#1f2229] text-white p-2 text-xs border border-white/10"
                            >
                                <option value="loop">loop</option>
                                <option value="once">once</option>
                                <option value="pingpong">pingpong</option>
                            </select>
                        </Field>

                        <Field label="Hold at ends" suffix="ms">
                            <input
                                type="number"
                                value={b.holdMs ?? 0}
                                onChange={(e) => updateBehavior(idx, { holdMs: Math.max(0, parseNumber(e.target.value, 0)) })}
                                className="w-full rounded-lg bg-[#1f2229] text-white p-2 text-xs border border-white/10"
                            />
                        </Field>
                    </div>

                    {/* Type-specific sections */}
                    {b.type === 'rotateSelf' && (
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 gap-2">
                                {['x', 'y', 'z'].map((axis, aIdx) => (
                                    <Field key={axis} label={`Axis ${axis}`}>
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
                                            className="w-full rounded-lg bg-[#1f2229] text-white p-2 text-xs border border-white/10"
                                        />
                                    </Field>
                                ))}
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <Field label="Speed" suffix="°/s">
                                    <input
                                        type="number"
                                        value={b.degreesPerSecond ?? 0}
                                        onChange={(e) =>
                                            updateBehavior(idx, { degreesPerSecond: parseNumber(e.target.value, 0) })
                                        }
                                        className="w-full rounded-lg bg-[#1f2229] text-white p-2 text-xs border border-white/10"
                                    />
                                </Field>

                                <Field label="Max angle" suffix="°" tooltip="Used in once/pingpong">
                                    <input
                                        type="number"
                                        value={b.maxAngleDeg ?? 0}
                                        onChange={(e) =>
                                            updateBehavior(idx, { maxAngleDeg: Math.max(0, parseNumber(e.target.value, 0)) })
                                        }
                                        className="w-full rounded-lg bg-[#1f2229] text-white p-2 text-xs border border-white/10"
                                    />
                                </Field>
                            </div>
                        </div>
                    )}

                    {b.type === 'orbit' && (
                        <div className="space-y-2">
                            <Field label="Target object">
                                <select
                                    value={b.targetObjectId || ''}
                                    onChange={(e) => updateBehavior(idx, { targetObjectId: e.target.value })}
                                    className="w-full rounded-lg bg-[#1f2229] text-white p-2 text-xs border border-white/10"
                                >
                                    <option value="">— Select object —</option>
                                    {selectableObjects.map((o) => (
                                        <option key={o.id} value={o.id}>
                                            {o.name || o.id}
                                        </option>
                                    ))}
                                </select>
                            </Field>

                            <div className="grid grid-cols-3 gap-2">
                                {['x', 'y', 'z'].map((axis, aIdx) => (
                                    <Field key={axis} label={`Axis ${axis}`}>
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
                                            className="w-full rounded-lg bg-[#1f2229] text-white p-2 text-xs border border-white/10"
                                        />
                                    </Field>
                                ))}
                            </div>

                            <div className="grid grid-cols-4 gap-2">
                                <Field label="Speed" suffix="°/s">
                                    <input
                                        type="number"
                                        value={b.degreesPerSecond ?? 0}
                                        onChange={(e) =>
                                            updateBehavior(idx, { degreesPerSecond: parseNumber(e.target.value, 0) })
                                        }
                                        className="w-full rounded-lg bg-[#1f2229] text-white p-2 text-xs border border-white/10"
                                    />
                                </Field>
                                <Field label="Radius">
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={b.radius ?? 0}
                                        onChange={(e) =>
                                            updateBehavior(idx, { radius: Math.max(0, parseNumber(e.target.value, 0)) })
                                        }
                                        className="w-full rounded-lg bg-[#1f2229] text-white p-2 text-xs border border-white/10"
                                    />
                                </Field>
                                <Field label="Start" suffix="°">
                                    <input
                                        type="number"
                                        value={b.initialAngleDeg ?? 0}
                                        onChange={(e) =>
                                            updateBehavior(idx, { initialAngleDeg: parseNumber(e.target.value, 0) })
                                        }
                                        className="w-full rounded-lg bg-[#1f2229] text-white p-2 text-xs border border-white/10"
                                    />
                                </Field>
                                <Field label="End" suffix="°">
                                    <input
                                        type="number"
                                        value={b.endAngleDeg ?? 180}
                                        onChange={(e) => updateBehavior(idx, { endAngleDeg: parseNumber(e.target.value, 180) })}
                                        className="w-full rounded-lg bg-[#1f2229] text-white p-2 text-xs border border-white/10"
                                    />
                                </Field>
                            </div>
                        </div>
                    )}

                    {b.type === 'translatePath' && (
                        <div className="space-y-2">
                            <Field label="Points (one [x,y,z] per line)">
                                <textarea
                                    rows={3}
                                    value={(b.points || [])
                                        .map((p) => `[${p[0]}, ${p[1]}, ${p[2]}]`)
                                        .join('\n')}
                                    onChange={(e) => {
                                        const lines = e.target.value.split('\n');
                                        const pts = [];
                                        for (const line of lines) {
                                            try {
                                                const arr = JSON.parse(line.replace(/(\d)\s*,\s*(\d)/g, '$1, $2'));
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
                                    className="w-full rounded-lg bg-[#1f2229] text-white p-2 text-xs border border-white/10 font-mono"
                                />
                            </Field>

                            <div className="grid grid-cols-4 gap-2">
                                <Field label="Duration" suffix="ms">
                                    <input
                                        type="number"
                                        min="1"
                                        value={b.durationMs ?? 1000}
                                        onChange={(e) =>
                                            updateBehavior(idx, { durationMs: Math.max(1, parseNumber(e.target.value, 1000)) })
                                        }
                                        className="w-full rounded-lg bg-[#1f2229] text-white p-2 text-xs border border-white/10"
                                    />
                                </Field>
                                <Field label="Easing">
                                    <select
                                        value={b.easing || 'linear'}
                                        onChange={(e) => updateBehavior(idx, { easing: e.target.value })}
                                        className="w-full rounded-lg bg-[#1f2229] text-white p-2 text-xs border border-white/10"
                                    >
                                        <option value="linear">linear</option>
                                        <option value="easeIn">easeIn</option>
                                        <option value="easeOut">easeOut</option>
                                        <option value="easeInOut">easeInOut</option>
                                    </select>
                                </Field>
                                <div className="flex items-end gap-4 pl-2">
                                    <label className="text-xs flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={!!b.closed}
                                            onChange={(e) => updateBehavior(idx, { closed: e.target.checked })}
                                        />
                                        closed
                                    </label>
                                    <label className="text-xs flex items-center gap-2">
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
        </div>
    );
}

/* -----------------------------
 * Small UI primitives (local)
 * ----------------------------- */
function Field({ label, suffix, tooltip, children }) {
    return (
        <label className="block text-xs">
            <div className="flex items-center gap-1 text-gray-400 mb-1">
                <span>{label}</span>
                {tooltip ? (
                    <span className="text-[10px] text-gray-500">{tooltip}</span>
                ) : null}
            </div>
            <div className="relative">
                {children}
                {suffix ? (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[10px] text-gray-400">
                        {suffix}
                    </span>
                ) : null}
            </div>
        </label>
    );
}

function IconButton({ title, onClick, icon: Icon, intent = 'default', disabled }) {
    const base =
        'inline-flex items-center justify-center h-8 w-8 rounded-lg border text-xs transition-colors';
    const variant =
        intent === 'danger'
            ? 'border-red-800/50 bg-red-900/20 hover:bg-red-900/30 text-red-300'
            : disabled
                ? 'border-white/10 bg-white/5 text-gray-400'
                : 'border-white/10 bg-white/5 hover:bg-white/10 text-gray-200';
    return (
        <button
            type="button"
            className={`${base} ${variant}`}
            title={title}
            onClick={onClick}
            disabled={disabled}
            aria-label={title}
        >
            <Icon className="h-4 w-4" />
        </button>
    );
}

// Minimal local icons (SVG) to avoid deps
function IconSave(props) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
            <path d="M7 21v-8h10v8M7 3v6h8" />
        </svg>
    );
}

function IconUndo(props) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
            <path d="M3 7h6v6" />
            <path d="M21 17a8 8 0 0 0-12-6L3 13" />
        </svg>
    );
}

function IconTrash(props) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        </svg>
    );
}

function IconSpinner(props) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props} className={`animate-spin ${props.className || ''}`}>
            <circle cx="12" cy="12" r="9" opacity="0.2" />
            <path d="M21 12a9 9 0 0 0-9-9" />
        </svg>
    );
}
