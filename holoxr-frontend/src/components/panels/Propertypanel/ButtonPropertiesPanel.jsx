// ButtonPropertiesPanel.jsx
import React, { useEffect, useState } from 'react';

export default function ButtonPropertiesPanel({ model, models, updateModelProps }) {
    const [projects, setProjects] = useState([]);
    const first = model.interactions?.[0] || {};

    // Fetch user's projects for dropdown (names + ids)
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${import.meta.env.VITE_API_URL}/api/projects?mine=1`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                if (!res.ok) return;
                const list = await res.json(); // expect [{ _id, name, ... }]
                if (mounted) setProjects(Array.isArray(list) ? list : []);
            } catch { }
        })();
        return () => { mounted = false; };
    }, []);

    const setInteraction = (patch) => {
        const current = model.interactions?.[0] || {};
        updateModelProps(model.id, { interactions: [{ ...current, ...patch }] });
    };

    return (
        <div className="space-y-3 pt-2 border-t border-gray-700">
            {/* Label */}
            <div>
                <label className="block text-sm font-medium mb-1">Label</label>
                <input
                    type="text"
                    value={model.appearance?.label || 'Tap'}
                    onChange={(e) =>
                        updateModelProps(model.id, {
                            appearance: { ...(model.appearance || {}), label: e.target.value },
                        })
                    }
                    className="w-full rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600"
                />
            </div>

            {/* Action select */}
            <div>
                <label className="block text-sm font-medium mb-1">On Tap → Action</label>
                <select
                    value={first.type || 'toggleVisibility'}
                    onChange={(e) => setInteraction({ type: e.target.value })}
                    className="w-full rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600"
                >
                    <option value="toggleVisibility">Toggle Visibility</option>
                    <option value="playPauseAnimation">Play/Pause Animation</option>
                    <option value="changeProject">Change Project</option>
                    <option value="NAVIGATE_SCENE">Navigate to Scene</option>
                </select>
            </div>

            {/* Target (for toggleVisibility/playPause/openClosePanel etc.) */}
            {(!first.type || first.type === 'toggleVisibility' || first.type === 'playPauseAnimation' || first.type === 'openClosePanel') && (
                <div>
                    <label className="block text-sm font-medium mb-1">Target Object</label>
                    <select
                        value={first.targetId || ''}
                        onChange={(e) => setInteraction({ targetId: e.target.value })}
                        className="w-full rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600"
                    >
                        <option value="">— Select object —</option>
                        {(models || [])
                            .filter((m) => m.id !== model.id && m.type !== 'button')
                            .map((m) => (
                                <option key={m.id} value={m.id}>
                                    {m.name || m.id}
                                </option>
                            ))}
                    </select>
                </div>
            )}

            {/* NAVIGATE_SCENE authoring */}
            {first.type === 'NAVIGATE_SCENE' && (
                <div className="space-y-2 rounded-md border border-gray-700 p-2">
                    <div>
                        <label className="block text-sm font-medium mb-1">Project</label>
                        <select
                            value={first.projectId || ''}
                            onChange={(e) => setInteraction({ projectId: e.target.value })}
                            className="w-full rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600"
                        >
                            <option value="">— Select project —</option>
                            {projects.map((p) => (
                                <option key={p._id} value={p._id}>
                                    {p.name || p._id}
                                </option>
                            ))}
                        </select>
                        <p className="mt-1 text-xs text-gray-400">
                            Don’t see your project? Make sure you’re logged in and have at least one project.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Scene ID (optional)</label>
                        <input
                            type="text"
                            placeholder="Leave empty if project has a single published scene"
                            value={first.sceneId || ''}
                            onChange={(e) => setInteraction({ sceneId: e.target.value })}
                            className="w-full rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600"
                        />
                        <p className="mt-1 text-xs text-gray-400">
                            Your current backend publishes one scene per project. You can leave this empty.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-sm font-medium mb-1">Transition</label>
                            <select
                                value={first.transition?.type || 'fade'}
                                onChange={(e) =>
                                    setInteraction({ transition: { ...(first.transition || {}), type: e.target.value } })
                                }
                                className="w-full rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600"
                            >
                                <option value="fade">Fade</option>
                                <option value="none">None</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Duration (ms)</label>
                            <input
                                type="number"
                                min={0}
                                step={50}
                                value={first.transition?.durationMs ?? 400}
                                onChange={(e) =>
                                    setInteraction({
                                        transition: { ...(first.transition || {}), durationMs: Number(e.target.value) || 0 },
                                    })
                                }
                                className="w-full rounded-md bg-[#2a2b2f] text-white p-1 text-sm border border-gray-600"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
