import type { FileMeta, ItemFull, ItemInput, ItemMeta, Session } from './types';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body.error ?? message;
    } catch {
      /* non-JSON error */
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

export const api = {
  // ---- auth ----
  register: (email: string, password: string, masterPassword: string) =>
    request<Session>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, masterPassword }),
    }),
  login: (email: string, password: string) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request<Session>('/auth/me'),
  unlock: (masterPassword: string) =>
    request('/auth/unlock', { method: 'POST', body: JSON.stringify({ masterPassword }) }),
  lock: () => request('/auth/lock', { method: 'POST' }),
  resetMaster: (newMasterPassword: string) =>
    request('/auth/master/reset', {
      method: 'POST',
      body: JSON.stringify({ newMasterPassword }),
    }),

  // ---- items ----
  listItems: (q?: string) =>
    request<ItemMeta[]>(`/items${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  getItem: (id: string) => request<ItemFull>(`/items/${id}`),
  createItem: (input: ItemInput) =>
    request<{ id: string }>('/items', { method: 'POST', body: JSON.stringify(input) }),
  updateItem: (id: string, input: Partial<ItemInput>) =>
    request(`/items/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  deleteItem: (id: string) => request(`/items/${id}`, { method: 'DELETE' }),

  // ---- files ----
  listFiles: () => request<FileMeta[]>('/files'),
  uploadFile: async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${BASE}/files`, {
      method: 'POST',
      credentials: 'include',
      body: form,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ApiError(res.status, body.error ?? 'Upload failed');
    }
    return res.json() as Promise<FileMeta>;
  },
  downloadFile: async (id: string, filename: string) => {
    const res = await fetch(`${BASE}/files/${id}/download`, { credentials: 'include' });
    if (!res.ok) throw new ApiError(res.status, 'Download failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },
  deleteFile: (id: string) => request(`/files/${id}`, { method: 'DELETE' }),
};
