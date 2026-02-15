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

// User role
export const userApi = {
  me: () => request('/api/me', { headers: headers() }),
};
