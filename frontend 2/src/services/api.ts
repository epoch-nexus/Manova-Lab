const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

const fetchClient = async (endpoint: string, options: RequestInit = {}) => {
  const token =
    localStorage.getItem('token') ||
    localStorage.getItem('accessToken') ||
    sessionStorage.getItem('token') ||
    sessionStorage.getItem('accessToken');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
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
      if (typeof errorData?.error === 'object' && errorData.error?.message) {
        errorMessage = errorData.error.message;
      } else if (typeof errorData?.error === 'string') {
        errorMessage = errorData.error;
      } else if (errorData?.message) {
        errorMessage = errorData.message;
      }
    } catch {
      errorMessage = response.statusText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  // Handle blob responses for CSV or binary downloads
  const contentType = response.headers.get('Content-Type') || '';
  if (
    contentType.includes('text/csv') ||
    (options.headers && (options.headers as Record<string, string>)['Accept'] === 'text/csv') ||
    endpoint.endsWith('.csv')
  ) {
    return response.blob();
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null;
  }

  return response.json();
};

export const api = {
  auth: {
    login: (email: string, password: string) =>
      fetchClient('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    register: (name: string, email: string, password: string) =>
      fetchClient('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name: name || undefined, email, password }),
      }),
    me: () => fetchClient('/auth/me'),
  },
  experiments: {
    list: (query?: Record<string, any>) => {
      const q = query ? `?${new URLSearchParams(query).toString()}` : '';
      return fetchClient(`/experiments${q}`);
    },
    create: (data: any) =>
      fetchClient('/experiments', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    get: (id: string) => fetchClient(`/experiments/${id}`),
    update: (id: string, data: any) =>
      fetchClient(`/experiments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string, force = false) =>
      fetchClient(`/experiments/${id}${force ? '?force=true' : ''}`, {
        method: 'DELETE',
      }),
    publish: (id: string) =>
      fetchClient(`/experiments/${id}/publish`, {
        method: 'POST',
      }),
  },
  participant: {
    startSession: (publicSlug: string, clientEnvironment?: Record<string, any>) =>
      fetchClient(`/participant/experiments/${publicSlug}/sessions`, {
        method: 'POST',
        body: JSON.stringify(clientEnvironment ? { clientEnvironment } : {}),
      }),
    getCurrentStep: (sessionId: string) =>
      fetchClient(`/participant/sessions/${sessionId}/current-step`),
    recordResponse: (sessionId: string, trialId: string, data: {
      submittedResponse?: string | null;
      reactionTimeMs?: number | null;
      timedOut?: boolean;
      timingMeasurement?: Record<string, any>;
      clientMetadata?: Record<string, any>;
    }) =>
      fetchClient(`/participant/sessions/${sessionId}/trials/${trialId}/response`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    abandonSession: (sessionId: string) =>
      fetchClient(`/participant/sessions/${sessionId}/abandon`, {
        method: 'POST',
      }),
  },
  results: {
    getStats: (experimentId: string, query?: Record<string, any>) => {
      const q = query ? `?${new URLSearchParams(query).toString()}` : '';
      return fetchClient(`/experiments/${experimentId}/results/summary${q}`);
    },
    getRaw: (experimentId: string, query?: Record<string, any>) => {
      const q = query ? `?${new URLSearchParams(query).toString()}` : '';
      return fetchClient(`/experiments/${experimentId}/results${q}`);
    },
    exportCsv: (experimentId: string, query?: Record<string, any>) => {
      const q = query ? `?${new URLSearchParams(query).toString()}` : '';
      return fetchClient(`/experiments/${experimentId}/results/export.csv${q}`, {
        headers: { Accept: 'text/csv' },
      });
    },
    exportJson: (experimentId: string, query?: Record<string, any>) => {
      const q = query ? `?${new URLSearchParams(query).toString()}` : '';
      return fetchClient(`/experiments/${experimentId}/results/export.json${q}`);
    },
  },
};

export default api;
