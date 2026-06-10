const STORAGE_TOKEN = 'chatGateToken';
const API_BASE = '/api';

export function saveToken(token) {
  localStorage.setItem(STORAGE_TOKEN, token);
}

export function getToken() {
  return localStorage.getItem(STORAGE_TOKEN);
}

export function clearToken() {
  localStorage.removeItem(STORAGE_TOKEN);
}

export async function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || 'Something went wrong.');
    error.code = data.code;
    error.status = response.status;
    error.suggestions = data.suggestions || [];
    throw error;
  }
  return data;
}
