import React, { useEffect, useMemo, useRef, useState } from 'react';
import { upsertObjectAnimation } from '../Studio/studioLogic';


export default function PropertyPanel({
  model,
  models,
  updateModelTransform,
  updateTextProperty,
  onPlayAnimation,
  updateModelProps,
  onStartAnchorPick,
  projectId,                  // NEW: needed to save behaviors
  objectBehaviors = [],       // NEW: current behaviors for this model (from animByObject[model.id]?.behaviors)
  onBehaviorsSaved,
}) {




  // -------------------- Animation (Behaviors) Editor Helpers --------------------
  const emptyRotateSelf = () => ({
    type: 'rotateSelf',
    enabled: true,
    axis: [0, 1, 0],
    degreesPerSecond: 45,
    loop: true,
    startDelayMs: 0
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
    startDelayMs: 0
  });
  const emptyTranslatePath = () => ({
    type: 'translatePath',
    enabled: true,
    points: [[0, 0, 0], [1, 0, 0]],
    durationMs: 3000,
    loop: true,
    closed: false,
    easing: 'linear',
    startDelayMs: 0
  });


  const selectableObjects = useMemo(
    () => (models || []).filter(m => m.type === 'model' && m.id !== model?.id),
    [models, model?.id]
  );


  // Local draft so creators can edit then Save
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
    setBehaviorsDraft(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  };
  const removeBehavior = (idx) => {
    setBehaviorsDraft(prev => prev.filter((_, i) => i !== idx));
  };
  const addBehavior = (kind) => {
    setBehaviorsDraft(prev => [
      ...prev,
      kind === 'rotateSelf' ? emptyRotateSelf()
        : kind === 'orbit' ? emptyOrbit()
          : emptyTranslatePath()
    ]);
  };
  const parseNumber = (v, def = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : def;
  };


  // Save to backend via /api/animations (upsert)
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const handleSaveBehaviors = async () => {
    if (!projectId || !model?.id) return;
    setSaving(true);
    setSaveMsg('');
    const saved = await upsertObjectAnimation(projectId, model.id, {
      enabled: true,
      version: Date.now(), // simple bump; server can coerce
      behaviors: behaviorsDraft
    });
    setSaving(false);
    if (saved) {
      setSaveMsg('Saved ✓');
      onBehaviorsSaved?.(model.id, saved); // parent updates animByObject map
    } else {
      setSaveMsg('Save failed');
    }
  };




  const handleChange = (field, value) => {
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) {
      updateModelTransform(model.id, { [field]: parsed });
    }
  };


  // Only used for plain text items
  const handleTextPropertyChange = (field, value) => {
    updateTextProperty(model.id, { [field]: value });
  };


  // Generic helpers for 'label' / 'quiz' / other items using updateModelProps
  const setProp = (key, value) => updateModelProps(model.id, { [key]: value });
  const setAppearance = (key, value) =>
    updateModelProps(model.id, { appearance: { ...(model.appearance || {}), [key]: value } });


  const transform = model?.transform || {};


  if (!model) {
    return (
      <div className="absolute top-20 bottom-4 right-4 w-72 bg-black/30 backdrop-blur-lg border border-white/10 shadow-xl rounded-3xl p-5 z-10 overflow-y-auto text-white space-y-4">
        <h2 className="text-m font-semibold">Properties</h2>
      </div>
    );
  }


  return (
    <div className="absolute top-20 bottom-4 right-4 w-72 bg-black/30 backdrop-blur-lg border border-white/10 shadow-xl rounded-3xl p-5 z-10 overflow-y-auto text-white space-y-4">
      <h2 className="text-m font-semibold">Properties</h2>


      {/* Transform Section */}
      {[
        { label: 'Position', keys: ['x', 'y', 'z'], def: 0 },
        { label: 'Rotation', keys: ['rx', 'ry', 'rz'], def: 0 },
        { label: 'Scale', keys: ['sx', 'sy', 'sz'], def: 1 }
      ].map(({ label, keys, def }) => (
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


      {/* Text Properties (3D Text item) */}
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


      {/* Button Properties */}
      {model.type === 'button' && (
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
      )}


      {/* Label Properties (UILabel3D) */}
      {model.type === 'label' && (
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
      )}


      {/* Quiz Properties */}
      {model.type === 'quiz' && (
        <div className="space-y-3 pt-2 border-t border-gray-700">
          <h3 className="text-sm font-semibold">Quiz</h3>


          {/* Meta */}
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              value={model.quiz?.title || ''}
              onChange={(e) =>
                setProp('quiz', { ...(model.quiz || {}), title: e.target.value })
              }
              className="w-full rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600"
            />
          </div>


          <div>
            <label className="block text-sm font-medium mb-1">Instructions</label>
            <textarea
              value={model.quiz?.instructions || ''}
              onChange={(e) =>
                setProp('quiz', { ...(model.quiz || {}), instructions: e.target.value })
              }
              rows={3}
              className="w-full rounded-md bg-[#2a2b2f] text-white p-2 text-sm border border-gray-600"
            />
          </div>


          {/* Settings */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium mb-1">Feedback</label>
              <select
                value={model.quiz?.settings?.feedbackMode || 'immediate'}
                onChange={(e) =>
                  setProp('quiz', {
                    ...(model.quiz || {}),
                    settings: { ...(model.quiz?.settings || {}), feedbackMode: e.target.value }
                  })
                }
                className="w-full rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600"
              >
                <option value="immediate">Immediate</option>
                <option value="deferred">Deferred</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Pass Score %</label>
              <input
                type="number"
                min="0"
                max="100"
                value={model.quiz?.settings?.passScore ?? 0}
                onChange={(e) => {
                  const v = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                  setProp('quiz', {
                    ...(model.quiz || {}),
                    settings: { ...(model.quiz?.settings || {}), passScore: v }
                  });
                }}
                className="w-full rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600"
              />
            </div>
          </div>


          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!model.quiz?.settings?.shuffle}
              onChange={(e) =>
                setProp('quiz', {
                  ...(model.quiz || {}),
                  settings: { ...(model.quiz?.settings || {}), shuffle: e.target.checked }
                })
              }
            />
            Shuffle questions
          </label>


          {/* Appearance */}
          <div className="pt-2 border-t border-gray-700 space-y-2">
            <h4 className="text-sm font-medium">Appearance</h4>
            <div className="flex items-center justify-between">
              <label className="text-sm">Background</label>
              <input
                type="color"
                value={model.appearance?.bg ?? '#111827'}
                onChange={(e) => setAppearance('bg', e.target.value)}
                className="h-8 w-14 rounded-md border border-gray-600 bg-[#2a2b2f]"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm">Text</label>
              <input
                type="color"
                value={model.appearance?.fg ?? '#ffffff'}
                onChange={(e) => setAppearance('fg', e.target.value)}
                className="h-8 w-14 rounded-md border border-gray-600 bg-[#2a2b2f]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Width</label>
              <input
                type="number"
                min="1"
                step="0.1"
                value={model.appearance?.width ?? 3.6}
                onChange={(e) => setAppearance('width', Math.max(1, parseFloat(e.target.value) || 3.6))}
                className="w-full rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!model.appearance?.billboard}
                onChange={(e) => setAppearance('billboard', e.target.checked)}
              />
              Billboard toward camera
            </label>
          </div>


          {/* Questions */}
          <div className="pt-2 border-t border-gray-700 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Questions</h4>
              <button
                onClick={() => {
                  const qs = [...(model.quiz?.questions || [])];
                  const nextId = `q${qs.length + 1}`;
                  qs.push({
                    id: nextId,
                    type: 'mcq',
                    prompt: 'New question',
                    options: ['Option A', 'Option B', 'Option C'],
                    correct: 0,
                    points: 1
                  });
                  setProp('quiz', { ...(model.quiz || {}), questions: qs });
                }}
                className="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded"
              >
                + Add
              </button>
            </div>


            {(model.quiz?.questions || []).map((q, idx) => (
              <div key={q.id || idx} className="rounded-lg border border-gray-700 p-3 space-y-2 bg-[#202228]">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-300">#{idx + 1} – {q.id || '—'}</span>
                  <div className="flex gap-2">
                    {/* Simple reorder up/down */}
                    <button
                      title="Move up"
                      onClick={() => {
                        const qs = [...(model.quiz?.questions || [])];
                        if (idx > 0) {
                          [qs[idx - 1], qs[idx]] = [qs[idx], qs[idx - 1]];
                          setProp('quiz', { ...(model.quiz || {}), questions: qs });
                        }
                      }}
                      className="text-xs bg-[#2a2b2f] hover:bg-[#33353e] px-2 py-1 rounded"
                    >↑</button>
                    <button
                      title="Move down"
                      onClick={() => {
                        const qs = [...(model.quiz?.questions || [])];
                        if (idx < qs.length - 1) {
                          [qs[idx + 1], qs[idx]] = [qs[idx], qs[idx + 1]];
                          setProp('quiz', { ...(model.quiz || {}), questions: qs });
                        }
                      }}
                      className="text-xs bg-[#2a2b2f] hover:bg-[#33353e] px-2 py-1 rounded"
                    >↓</button>
                    <button
                      onClick={() => {
                        const qs = (model.quiz?.questions || []).filter((_, i) => i !== idx);
                        setProp('quiz', { ...(model.quiz || {}), questions: qs });
                      }}
                      className="text-xs bg-red-600 hover:bg-red-700 px-2 py-1 rounded"
                    >
                      Delete
                    </button>
                  </div>
                </div>


                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select
                    value={q.type}
                    onChange={(e) => {
                      const t = e.target.value;
                      const qs = [...(model.quiz?.questions || [])];
                      const next = { ...q, type: t };
                      if (t === 'mcq' && !Array.isArray(next.options)) {
                        next.options = ['Option A', 'Option B'];
                        next.correct = 0;
                      }
                      if (t === 'boolean') {
                        next.correct = !!q.correct; // true/false
                        delete next.options;
                      }
                      if (t === 'text') {
                        next.correct = (typeof q.correct === 'string' ? q.correct : '');
                        delete next.options;
                      }
                      qs[idx] = next;
                      setProp('quiz', { ...(model.quiz || {}), questions: qs });
                    }}
                    className="w-full rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600"
                  >
                    <option value="mcq">Multiple Choice</option>
                    <option value="boolean">True / False</option>
                    <option value="text">Short Text</option>
                  </select>
                </div>


                <div>
                  <label className="block text-sm font-medium mb-1">Prompt</label>
                  <textarea
                    value={q.prompt || ''}
                    onChange={(e) => {
                      const qs = [...(model.quiz?.questions || [])];
                      qs[idx] = { ...q, prompt: e.target.value };
                      setProp('quiz', { ...(model.quiz || {}), questions: qs });
                    }}
                    rows={2}
                    className="w-full rounded-md bg-[#2a2b2f] text-white p-2 text-sm border border-gray-600"
                  />
                </div>


                {/* Type-specific editors */}
                {q.type === 'mcq' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">Options (comma-separated)</label>
                      <input
                        type="text"
                        value={(q.options || []).join(', ')}
                        onChange={(e) => {
                          const raw = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                          const qs = [...(model.quiz?.questions || [])];
                          let correct = q.correct ?? 0;
                          if (raw.length === 0) {
                            // keep at least one placeholder
                            raw.push('Option');
                            correct = 0;
                          }
                          if (correct >= raw.length) correct = 0;
                          qs[idx] = { ...q, options: raw, correct };
                          setProp('quiz', { ...(model.quiz || {}), questions: qs });
                        }}
                        className="w-full rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600"
                      />
                    </div>


                    <div>
                      <label className="block text-sm font-medium mb-1">Correct Option (index)</label>
                      <input
                        type="number"
                        min="0"
                        max={(q.options?.length || 1) - 1}
                        value={parseInt(q.correct ?? 0)}
                        onChange={(e) => {
                          const idxCorrect = Math.max(0, Math.min(parseInt(e.target.value) || 0, (q.options?.length || 1) - 1));
                          const qs = [...(model.quiz?.questions || [])];
                          qs[idx] = { ...q, correct: idxCorrect };
                          setProp('quiz', { ...(model.quiz || {}), questions: qs });
                        }}
                        className="w-full rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600"
                      />
                      <p className="text-xs text-gray-400 mt-1">0-based index. Options: {q.options?.map((o, i) => `${i}:${o}`).join(' | ')}</p>
                    </div>
                  </>
                )}


                {q.type === 'boolean' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Correct Answer</label>
                    <select
                      value={q.correct ? 'true' : 'false'}
                      onChange={(e) => {
                        const qs = [...(model.quiz?.questions || [])];
                        qs[idx] = { ...q, correct: e.target.value === 'true' };
                        setProp('quiz', { ...(model.quiz || {}), questions: qs });
                      }}
                      className="w-full rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600"
                    >
                      <option value="true">True</option>
                      <option value="false">False</option>
                    </select>
                  </div>
                )}


                {q.type === 'text' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Correct Text</label>
                    <input
                      type="text"
                      value={typeof q.correct === 'string' ? q.correct : ''}
                      onChange={(e) => {
                        const qs = [...(model.quiz?.questions || [])];
                        qs[idx] = { ...q, correct: e.target.value };
                        setProp('quiz', { ...(model.quiz || {}), questions: qs });
                      }}
                      className="w-full rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600"
                    />
                    <p className="text-xs text-gray-400 mt-1">Match is case-insensitive & trims whitespace.</p>
                  </div>
                )}


                {/* Common fields */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium mb-1">Points</label>
                    <input
                      type="number"
                      min="0"
                      value={q.points ?? 1}
                      onChange={(e) => {
                        const pts = Math.max(0, parseInt(e.target.value) || 0);
                        const qs = [...(model.quiz?.questions || [])];
                        qs[idx] = { ...q, points: pts };
                        setProp('quiz', { ...(model.quiz || {}), questions: qs });
                      }}
                      className="w-full rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">ID</label>
                    <input
                      type="text"
                      value={q.id || ''}
                      onChange={(e) => {
                        const qs = [...(model.quiz?.questions || [])];
                        qs[idx] = { ...q, id: e.target.value || `q${idx + 1}` };
                        setProp('quiz', { ...(model.quiz || {}), questions: qs });
                      }}
                      className="w-full rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600"
                    />
                  </div>
                </div>


                <div>
                  <label className="block text-sm font-medium mb-1">Explanation (shown in feedback)</label>
                  <textarea
                    rows={2}
                    value={q.explanation || ''}
                    onChange={(e) => {
                      const qs = [...(model.quiz?.questions || [])];
                      qs[idx] = { ...q, explanation: e.target.value };
                      setProp('quiz', { ...(model.quiz || {}), questions: qs });
                    }}
                    className="w-full rounded-md bg-[#2a2b2f] text-white p-2 text-sm border border-gray-600"
                  />
                </div>
              </div>
            ))}
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


          {behaviorsDraft.length === 0 && (
            <p className="text-xs text-gray-400">No behaviors yet. Add one above.</p>
          )}


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
                <button
                  onClick={() => removeBehavior(idx)}
                  className="text-xs bg-red-600 hover:bg-red-700 px-2 py-1 rounded"
                >
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


              {/* Type-specific fields */}
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
                      {selectableObjects.map(o => (
                        <option key={o.id} value={o.id}>{o.name || o.id}</option>
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
                      value={(b.points || []).map(p => `[${p[0]}, ${p[1]}, ${p[2]}]`).join('\n')}
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



