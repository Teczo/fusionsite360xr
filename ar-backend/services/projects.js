// services/projects.js
export async function getProject(projectId, token) {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to load project');
    return res.json();
}

export async function saveProject(projectId, scene, token) {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ scene }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save project');
    return data;
}

export async function publishProject(projectId, scene, token) {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/projects/${projectId}/publish`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ scene }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to publish project');
    return data;
}
