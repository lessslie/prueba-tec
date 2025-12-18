'use client';

import { useEffect, useState } from 'react';
import styles from '../app/page.module.css';
import { API_BASE } from '../lib/config';
import { clearToken, getAuthHeaders, getToken, setToken } from '../lib/auth';

type Props = {
  onAuthChanged: (token: string | null) => void;
};

export function AuthPanel({ onAuthChanged }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mode, setMode] = useState<'idle' | 'login' | 'signup'>('idle');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);

  const loadMe = async () => {
    const res = await fetch(`${API_BASE}/auth/me`, { headers: getAuthHeaders() });
    if (!res.ok) {
      setCurrentEmail(null);
      return;
    }
    const data = await res.json();
    setCurrentEmail(data.email || null);
  };

  useEffect(() => {
    if (getToken()) {
      loadMe();
    }
  }, []);

  const handleSubmit = async (path: 'login' | 'signup') => {
    setLoading(true);
    setError(null);
    try {
      if (path === 'signup' && password !== confirmPassword) {
        throw new Error('Las contrasenas no coinciden.');
      }
      const res = await fetch(`${API_BASE}/auth/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          const message = Array.isArray(data?.message)
            ? data.message.join(', ')
            : data?.message;
          throw new Error(message || 'No se pudo iniciar sesion');
        }
        const msg = await res.text();
        throw new Error(msg || 'No se pudo iniciar sesion');
      }
      const data = await res.json();
      setToken(data.accessToken);
      setCurrentEmail(data.user?.email || email);
      onAuthChanged(data.accessToken);
    } catch (err: any) {
      setError(err?.message || 'No se pudo iniciar sesion');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearToken();
    setCurrentEmail(null);
    onAuthChanged(null);
  };

  return (
    <div className={styles.panelSection}>
      <h3>Iniciar sesion</h3>
      {currentEmail ? (
        <div className={styles.authRow}>
          <span className={styles.badgeSmall}>Sesion activa: {currentEmail}</span>
          <button type="button" className={styles.secondaryButton} onClick={handleLogout}>
            Cerrar sesion
          </button>
        </div>
      ) : mode === 'idle' ? (
        <div className={styles.authChoice}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => setMode('login')}
          >
            Iniciar sesion
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => setMode('signup')}
          >
            Crear cuenta
          </button>
        </div>
      ) : (
        <div className={styles.authForm}>
          <div className={styles.authLeft}>
            <div className={styles.authHeader}>
              <span className={styles.badgeSmall}>
                {mode === 'login' ? 'Ingreso' : 'Registro'}
              </span>
              <button
                type="button"
                className={styles.linkButton}
                onClick={() => {
                  setMode('idle');
                  setError(null);
                }}
              >
                Cambiar
              </button>
            </div>
            <div className={styles.authRow}>
              <button
                type="button"
                className={`${styles.primaryButton} ${styles.authAction}`}
                disabled={loading}
                onClick={() => handleSubmit(mode === 'login' ? 'login' : 'signup')}
              >
                {loading
                  ? 'Enviando...'
                  : mode === 'login'
                    ? 'Ingresar'
                    : 'Crear cuenta'}
              </button>
            </div>
          </div>
          <div className={styles.authRight}>
            <div className={styles.authFields}>
              <label>
                <span>Email</span>
                <input value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
              <label>
                <span>Contrasena</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              {mode === 'signup' && (
                <label>
                  <span>Confirmar contrasena</span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </label>
              )}
            </div>
            <p className={styles.hint}>
              {mode === 'signup'
                ? 'Crear cuenta registra tu usuario y te inicia sesion.'
                : 'Usa tu email y contrasena para ingresar.'}
            </p>
          </div>
        </div>
      )}
      {error && <p className={styles.errorText}>{error}</p>}
    </div>
  );
}
