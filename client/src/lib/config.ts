import { Capacitor } from '@capacitor/core';

/**
 * Runtime connection settings.
 *
 * The web build always talks to the origin it was served from ("/api" in the
 * single-service production deploy), so nothing here is configurable there.
 * The Android build is a WebView with no server of its own, so the user points
 * it at their Lockly server on first launch and we remember the choice.
 */

const SERVER_URL_KEY = 'lockly.serverUrl';
const TOKEN_KEY = 'lockly.token';

export const isNative = Capacitor.isNativePlatform();

/** Baked in at build time: "/api" in production, the dev API in `npm run dev`. */
const webApiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

/**
 * Turns whatever the user typed ("172.16.51.26:4000", "https://lockly.up.railway.app/")
 * into a usable API base ending in /api.
 */
export function normalizeServerUrl(raw: string): string {
  let url = raw.trim();
  if (!url) return '';
  if (!/^https?:\/\//i.test(url)) url = `http://${url}`;
  url = url.replace(/\/+$/, '');
  if (!/\/api$/i.test(url)) url += '/api';
  return url;
}

/** The API base to call, or null on native before the user has set one. */
export function getApiBase(): string | null {
  if (!isNative) return webApiBase;
  return localStorage.getItem(SERVER_URL_KEY);
}

export function setApiBase(apiBase: string): void {
  localStorage.setItem(SERVER_URL_KEY, apiBase);
}

/** Forgets the server *and* the session tied to it. */
export function clearApiBase(): void {
  localStorage.removeItem(SERVER_URL_KEY);
  clearToken();
}

/** Human-readable origin for display, e.g. "http://172.16.51.26:4000". */
export function serverOrigin(apiBase: string): string {
  return apiBase.replace(/\/api$/i, '');
}

/** True when credentials would cross the network unencrypted (LAN HTTP). */
export function isInsecure(apiBase: string): boolean {
  return /^http:\/\//i.test(apiBase) && !/^https?:\/\/localhost\b/i.test(apiBase);
}

// ---- session token (native only) ----
// Browsers keep the session in an httpOnly cookie, which page JS can't read and
// which the WebView's cross-origin requests would never send anyway.

export function getToken(): string | null {
  return isNative ? localStorage.getItem(TOKEN_KEY) : null;
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}
