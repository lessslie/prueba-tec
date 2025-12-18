import { clearToken, getAuthHeaders, markSessionExpired } from './auth';

export function handleUnauthorized() {
  if (typeof window === 'undefined') return;
  markSessionExpired();
  clearToken();
  window.location.assign('/login');
}

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const authHeaders = getAuthHeaders();
  Object.entries(authHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });

  const res = await fetch(input, { ...init, headers });
  if (res.status === 401) {
    handleUnauthorized();
  }
  return res;
}
