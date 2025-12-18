const TOKEN_KEY = 'ratelibre_token';
const AUTH_EVENT = 'auth-change';
const SESSION_EXPIRED_KEY = 'session_expired';
const SESSION_EXPIRED_EVENT = 'session-expired';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TOKEN_KEY, token);
  clearSessionExpired();
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function clearToken() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function markSessionExpired() {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SESSION_EXPIRED_KEY, '1');
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}

export function clearSessionExpired() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(SESSION_EXPIRED_KEY);
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}

export function isSessionExpired(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(SESSION_EXPIRED_KEY) === '1';
}

export function getSessionExpiredEventName() {
  return SESSION_EXPIRED_EVENT;
}

function decodeTokenPayload(token: string): Record<string, unknown> | null {
  if (typeof window === 'undefined') return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), '=');
  try {
    return JSON.parse(window.atob(padded));
  } catch {
    return null;
  }
}

export function getTokenExpirationMs(token: string): number | null {
  const payload = decodeTokenPayload(token);
  const exp = payload?.exp;
  if (typeof exp !== 'number') return null;
  return exp * 1000;
}
