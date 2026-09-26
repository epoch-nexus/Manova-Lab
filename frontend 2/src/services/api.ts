const API_BASE_URL = 'http://localhost:3000/api/v1';

const fetchClient = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = 'An error occurred';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch (e) {
      errorMessage = response.statusText;
    }
    throw new Error(errorMessage);
  }

  // Handle blob responses for CSV export
  if (options.headers && (options.headers as Record<string, string>)['Accept'] === 'text/csv') {
    return response.blob();
  }

  return response.json();
};

export const api = {
  auth: {
    login: (email, password) => fetchClient('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    register: (name, email, password) => fetchClient('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  },
  experiments: {
    list: () => fetchClient('/experiments'),
    create: (data) => fetchClient('/experiments', { method: 'POST', body: JSON.stringify(data) }),
    get: (id) => fetchClient(`/experiments/${id}`),
    update: (id, data) => fetchClient(`/experiments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => fetchClient(`/experiments/${id}`, { method: 'DELETE' }),
    publish: (id) => fetchClient(`/experiments/${id}/publish`, { method: 'POST' }),
  },
  participant: {
    startSession: (versionId) => fetchClient('/participant/session', { method: 'POST', body: JSON.stringify({ versionId }) }),
    recordResponse: (sessionId, data) => fetchClient(`/participant/session/${sessionId}/response`, { method: 'POST', body: JSON.stringify(data) }),
  },
  results: {
    getStats: (experimentId) => fetchClient(`/experiments/${experimentId}/results/stats`),
    exportCsv: (experimentId) => fetchClient(`/experiments/${experimentId}/results/export/csv`, { headers: { Accept: 'text/csv' } }),
  }
};

export default api;
