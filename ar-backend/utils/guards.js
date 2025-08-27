// backend/utils/guards.js
import Project from '../models/Project.js';

// Ensures the current user is the owner of the project
export async function ensureProjectOwner(projectId, userId) {
    const project = await Project.findById(projectId);
    if (!project) {
        return { error: 'Project not found', status: 404 };
    }
    if (String(project.owner) !== String(userId)) {
        return { error: 'Not authorized to edit this project', status: 403 };
    }
    return { ok: true };
}
