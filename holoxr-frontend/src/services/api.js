const API = import.meta.env.VITE_API_URL;

function headers(json = true) {
  const h = { Authorization: `Bearer ${localStorage.getItem('token')}` };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

async function request(url, opts = {}) {
  const res = await fetch(`${API}${url}`, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// Projects
export const projectApi = {
  updateLocation: (projectId, location) =>
    request(`/api/projects/${projectId}/location`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify({ location }),
    }),
};

// Timeline
export const timelineApi = {
  list: (projectId) => request(`/api/projects/${projectId}/timeline`, { headers: headers() }),
  create: (projectId, body) =>
    request(`/api/projects/${projectId}/timeline`, {
      method: 'POST', headers: headers(), body: JSON.stringify(body),
    }),
  update: (projectId, timelineId, body) =>
    request(`/api/projects/${projectId}/timeline/${timelineId}`, {
      method: 'PUT', headers: headers(), body: JSON.stringify(body),
    }),
  remove: (projectId, timelineId) =>
    request(`/api/projects/${projectId}/timeline/${timelineId}`, {
      method: 'DELETE', headers: headers(),
    }),
};

// HSE
export const hseApi = {
  list: (projectId) => request(`/api/projects/${projectId}/hse`, { headers: headers() }),
  create: (projectId, body) =>
    request(`/api/projects/${projectId}/hse`, {
      method: 'POST', headers: headers(), body: JSON.stringify(body),
    }),
  update: (projectId, hseId, body) =>
    request(`/api/projects/${projectId}/hse/${hseId}`, {
      method: 'PUT', headers: headers(), body: JSON.stringify(body),
    }),
  remove: (projectId, hseId) =>
    request(`/api/projects/${projectId}/hse/${hseId}`, {
      method: 'DELETE', headers: headers(),
    }),
  importCsv: (projectId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request(`/api/projects/${projectId}/hse/import`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: formData,
    });
  },
  clear: (projectId) =>
    request(`/api/projects/${projectId}/hse`, {
      method: 'DELETE', headers: headers(),
    }),
};

// Alerts
export const alertsApi = {
  list: (projectId) => request(`/api/projects/${projectId}/alerts`, { headers: headers() }),
  create: (projectId, body) =>
    request(`/api/projects/${projectId}/alerts`, {
      method: 'POST', headers: headers(), body: JSON.stringify(body),
    }),
  update: (projectId, alertId, body) =>
    request(`/api/projects/${projectId}/alerts/${alertId}`, {
      method: 'PUT', headers: headers(), body: JSON.stringify(body),
    }),
  remove: (projectId, alertId) =>
    request(`/api/projects/${projectId}/alerts/${alertId}`, {
      method: 'DELETE', headers: headers(),
    }),
};

// S-Curve
export const scurveApi = {
  get: (projectId) => request(`/api/projects/${projectId}/s-curve`, { headers: headers() }),
  update: (projectId, body) =>
    request(`/api/projects/${projectId}/s-curve`, {
      method: 'PUT', headers: headers(), body: JSON.stringify(body),
    }),
  generate: (projectId) =>
    request(`/api/projects/${projectId}/s-curve/generate`, {
      method: 'POST', headers: headers(),
    }),
};

// Media
export const mediaApi = {
  list: (projectId) => request(`/api/projects/${projectId}/media`, { headers: headers() }),
  upload: (projectId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request(`/api/projects/${projectId}/media`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: formData,
    });
  },
  remove: (projectId, mediaId) =>
    request(`/api/projects/${projectId}/media/${mediaId}`, {
      method: 'DELETE', headers: headers(),
    }),
};

// Documents
export const documentsApi = {
  list: (projectId) => request(`/api/projects/${projectId}/documents`, { headers: headers() }),
  upload: (projectId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request(`/api/projects/${projectId}/documents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: formData,
    });
  },
  remove: (projectId, documentId) =>
    request(`/api/projects/${projectId}/documents/${documentId}`, {
      method: 'DELETE', headers: headers(),
    }),
};

// Schedule
export const scheduleApi = {
  upload: (projectId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request(`/api/projects/${projectId}/schedule/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: formData,
    });
  },
  list: (projectId) =>
    request(`/api/projects/${projectId}/schedule`, { headers: headers() }),
  clear: (projectId) =>
    request(`/api/projects/${projectId}/schedule`, {
      method: 'DELETE', headers: headers(),
    }),
};

// User role
export const userApi = {
  me: () => request('/api/me', { headers: headers() }),
};

// Issues
export const issuesApi = {
  list: (projectId) =>
    request(`/api/projects/${projectId}/issues`, { headers: headers() }),
  upload: (projectId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request(`/api/projects/${projectId}/issues/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: formData,
    });
  },
  create: (projectId, body) =>
    request(`/api/projects/${projectId}/issues`, {
      method: 'POST', headers: headers(), body: JSON.stringify(body),
    }),
  update: (issueId, body) =>
    request(`/api/issues/${issueId}`, {
      method: 'PATCH', headers: headers(), body: JSON.stringify(body),
    }),
  remove: (issueId) =>
    request(`/api/issues/${issueId}`, {
      method: 'DELETE', headers: headers(),
    }),
  // Returns project owner + teamMembers as assignable users
  members: (projectId) =>
    request(`/api/projects/${projectId}/members`, { headers: headers() }),

  // Upload a file attachment to an issue (multipart/form-data)
  uploadAttachment: (issueId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request(`/api/issues/${issueId}/attachments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: formData,
    });
  },

  // Remove an attachment from an issue by its Blob URL
  deleteAttachment: (issueId, attachmentUrl) =>
    request(`/api/issues/${issueId}/attachments`, {
      method: 'DELETE',
      headers: headers(),
      body: JSON.stringify({ attachmentUrl }),
    }),
  clear: (projectId) =>
    request(`/api/projects/${projectId}/issues`, {
      method: 'DELETE', headers: headers(),
    }),
};

// AI
export const aiApi = {
  query: (projectId, question, selectedElementId = null) =>
    request('/api/ai/query', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ projectId, question, selectedElementId }),
    }),
  getSettings: () => request('/api/ai/settings', { headers: headers() }),
  updateSettings: (settings) =>
    request('/api/ai/settings', {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify(settings),
    }),
  removeKey: () =>
    request('/api/ai/settings/key', { method: 'DELETE', headers: headers() }),
  submitFeedback: (auditLogId, feedback, comment = null) =>
    request('/api/ai/feedback', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ auditLogId, feedback, comment }),
    }),
  getHistory: (limit = 20, projectId = null) => {
    const params = new URLSearchParams({ limit });
    if (projectId) params.append('projectId', projectId);
    return request(`/api/ai/history?${params}`, { headers: headers() });
  },
};

// BIM
export const bimApi = {
  upload: (projectId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request(`/api/projects/${projectId}/bim/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: formData,
    });
  },
  // NAME-BASED lookup (primary)
  getByName: (projectId, elementName) =>
    request(`/api/projects/${projectId}/bim/by-name/${encodeURIComponent(elementName)}`, {
      headers: headers(),
    }),
  // GUID-based lookup (legacy)
  get: (projectId, elementGuid) =>
    request(`/api/projects/${projectId}/bim/${encodeURIComponent(elementGuid)}`, {
      headers: headers(),
    }),
};

// Cost
export const costApi = {
  list: (projectId) => request(`/api/projects/${projectId}/cost`, { headers: headers() }),
  upload: (projectId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request(`/api/projects/${projectId}/cost/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: formData,
    });
  },
  clear: (projectId) =>
    request(`/api/projects/${projectId}/cost`, {
      method: 'DELETE', headers: headers(),
    }),
};

// Contractor Performance
export const contractorApi = {
  list: (projectId) => request(`/api/projects/${projectId}/contractor-performance`, { headers: headers() }),
  upload: (projectId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request(`/api/projects/${projectId}/contractor-performance/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: formData,
    });
  },
  clear: (projectId) =>
    request(`/api/projects/${projectId}/contractor-performance`, {
      method: 'DELETE', headers: headers(),
    }),
};

// Assignments
export const assignmentApi = {
  list: (projectId) => request(`/api/projects/${projectId}/assignments`, { headers: headers() }),
  upload: (projectId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request(`/api/projects/${projectId}/assignments/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: formData,
    });
  },
  clear: (projectId) =>
    request(`/api/projects/${projectId}/assignments`, {
      method: 'DELETE', headers: headers(),
    }),
};

// Materials
export const materialApi = {
  list: (projectId) => request(`/api/projects/${projectId}/materials`, { headers: headers() }),
  upload: (projectId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request(`/api/projects/${projectId}/materials/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: formData,
    });
  },
  clear: (projectId) =>
    request(`/api/projects/${projectId}/materials`, {
      method: 'DELETE', headers: headers(),
    }),
};
