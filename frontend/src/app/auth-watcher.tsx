'use client';

import { useEffect } from 'react';
import { getToken, getTokenExpirationMs } from '../lib/auth';
import { handleUnauthorized } from '../lib/http';

export function AuthWatcher() {
  useEffect(() => {
    let timer: number | undefined;

    const scheduleLogout = () => {
      if (timer) window.clearTimeout(timer);
      const token = getToken();
      if (!token) return;
      const expiresAt = getTokenExpirationMs(token);
      if (!expiresAt) return;
      const remaining = expiresAt - Date.now();
      if (remaining <= 0) {
        handleUnauthorized();
        return;
      }
      timer = window.setTimeout(handleUnauthorized, remaining);
    };

    scheduleLogout();
    const onAuthChange = () => scheduleLogout();
    window.addEventListener('auth-change', onAuthChange);
    window.addEventListener('storage', onAuthChange);

    return () => {
      if (timer) window.clearTimeout(timer);
      window.removeEventListener('auth-change', onAuthChange);
      window.removeEventListener('storage', onAuthChange);
    };
  }, []);

  return null;
}
