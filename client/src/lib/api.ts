import { getApiBase, getToken, isNative, setToken, clearToken } from './config';
import { saveBlob } from './download';
import type { FileMeta, ItemFull, ItemInput, ItemMeta, Session } from './types';

/**
 * Resolved per call rather than at module load: on Android the user can point
 * the app at a different server without a restart.
 */
function base(): string {
  const b = getApiBase();
  if (!b) throw new ApiError(0, 'No Lockly server configured');
  return b;
}

/**
 * Native builds authenticate with a bearer token (see wantsBodyToken on the
 * server); browsers keep using the httpOnly cookie.
 */
function authHeaders(): Record<string, string> {
  if (!isNative) return {};
  const token = getToken();
  return {
    'X-Auth-Mode': 'token',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${base()}${path}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
        ...(init?.headers ?? {}),
      },
      ...init,
    });
  } catch (err) {
    // fetch only rejects on transport failure — unreachable host, DNS, TLS,
    // or a blocked cleartext request. Surface it as something actionable.
    if (err instanceof ApiError) throw err;
    throw new ApiError(0, "Can't reach the Lockly server. Check the address and that it's running.");
  }
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

/** Stashes the token native builds get back instead of a cookie. */
function keepToken<T extends { token?: string }>(result: T): T {
  if (isNative && result?.token) setToken(result.token);
  return result;
}

export const api = {
  /** Unauthenticated reachability probe, used by the Android setup screen. */
  health: (apiBase: string) =>
    fetch(`${apiBase}/health`, { headers: { Accept: 'application/json' } }).then(async (res) => {
      if (!res.ok) throw new ApiError(res.status, `Server responded ${res.status}`);
      const body = (await res.json()) as { service?: string };
      if (body.service !== 'lockly') throw new ApiError(0, 'That address is not a Lockly server');
      return body;
    }),

  // ---- auth ----
  register: (email: string, password: string, masterPassword: string) =>
    request<Session & { token?: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, masterPassword }),
    }).then(keepToken),
  login: (email: string, password: string) =>
    request<{ token?: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }).then(keepToken),
  logout: () =>
    request('/auth/logout', { method: 'POST' }).finally(() => {
      // Drop the local token even if the call failed — the user asked to sign out.
      if (isNative) clearToken();
    }),
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
  uploadFile: async (file: File, folder?: string | null) => {
    const form = new FormData();
    form.append('file', file);
    if (folder) form.append('folder', folder);
    const res = await fetch(`${base()}/files`, {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders(), // no Content-Type: the browser sets the multipart boundary
      body: form,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new ApiError(res.status, body.error ?? 'Upload failed');
    }
    return res.json() as Promise<FileMeta>;
  },
  downloadFile: async (id: string, filename: string) => {
    const res = await fetch(`${base()}/files/${id}/download`, {
      credentials: 'include',
      headers: authHeaders(),
    });
    if (!res.ok) throw new ApiError(res.status, 'Download failed');
    await saveBlob(await res.blob(), filename);
  },
  deleteFile: (id: string) => request(`/files/${id}`, { method: 'DELETE' }),
  /** Move a file to a folder; null clears it. */
  moveFile: (id: string, folder: string | null) =>
    request<FileMeta>(`/files/${id}`, { method: 'PATCH', body: JSON.stringify({ folder }) }),
};
