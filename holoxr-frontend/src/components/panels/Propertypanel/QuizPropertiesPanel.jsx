import React from 'react';

export default function QuizPropertiesPanel({ model, setProp, setAppearance }) {
    return (
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
                                settings: { ...(model.quiz?.settings || {}), feedbackMode: e.target.value },
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
                                settings: { ...(model.quiz?.settings || {}), passScore: v },
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
                            settings: { ...(model.quiz?.settings || {}), shuffle: e.target.checked },
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
                        onChange={(e) =>
                            setAppearance('width', Math.max(1, parseFloat(e.target.value) || 3.6))
                        }
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
                                points: 1,
                            });
                            setProp('quiz', { ...(model.quiz || {}), questions: qs });
                        }}
                        className="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded"
                    >
                        + Add
                    </button>
                </div>

                {(model.quiz?.questions || []).map((q, idx) => (
                    <div
                        key={q.id || idx}
                        className="rounded-lg border border-gray-700 p-3 space-y-2 bg-[#202228]"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-300">
                                #{idx + 1} – {q.id || '—'}
                            </span>
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
                                >
                                    ↑
                                </button>
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
                                >
                                    ↓
                                </button>
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
                                        next.correct = !!q.correct;
                                        delete next.options;
                                    }
                                    if (t === 'text') {
                                        next.correct = typeof q.correct === 'string' ? q.correct : '';
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
                                    <label className="block text-sm font-medium mb-1">
                                        Options (comma-separated)
                                    </label>
                                    <input
                                        type="text"
                                        value={(q.options || []).join(', ')}
                                        onChange={(e) => {
                                            const raw = e.target.value
                                                .split(',')
                                                .map((s) => s.trim())
                                                .filter(Boolean);
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
                                    <label className="block text-sm font-medium mb-1">
                                        Correct Option (index)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max={(q.options?.length || 1) - 1}
                                        value={parseInt(q.correct ?? 0)}
                                        onChange={(e) => {
                                            const idxCorrect = Math.max(
                                                0,
                                                Math.min(parseInt(e.target.value) || 0, (q.options?.length || 1) - 1)
                                            );
                                            const qs = [...(model.quiz?.questions || [])];
                                            qs[idx] = { ...q, correct: idxCorrect };
                                            setProp('quiz', { ...(model.quiz || {}), questions: qs });
                                        }}
                                        className="w-full rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">
                                        0-based index. Options: {q.options?.map((o, i) => `${i}:${o}`).join(' | ')}
                                    </p>
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
                                <p className="text-xs text-gray-400 mt-1">
                                    Match is case-insensitive & trims whitespace.
                                </p>
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
                            <label className="block text-sm font-medium mb-1">
                                Explanation (shown in feedback)
                            </label>
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
    );
}