'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../app/page.module.css';
import { API_BASE } from '../lib/config';
import { getToken, setToken } from '../lib/auth';

type Props = {
  mode: 'login' | 'signup';
};

export function AuthForm({ mode }: Props) {
  const router = useRouter();
  const isLogin = mode === 'login';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (getToken()) {
      router.replace('/');
    }
  }, [router]);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!email.trim() || !password) {
        throw new Error('Completa email y contrasena.');
      }
      if (!isLogin && password !== confirmPassword) {
        throw new Error('Las contrasenas no coinciden.');
      }
      const path = isLogin ? 'login' : 'signup';
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
      if (!data?.accessToken) {
        throw new Error('No se recibio un token valido.');
      }
      setToken(data.accessToken);
      router.replace('/connect-ml');
    } catch (err: any) {
      setError(err?.message || 'No se pudo iniciar sesion');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitch = () => {
    router.push(isLogin ? '/register' : '/login');
  };

  return (
    <div className={`${styles.panelSection} ${styles.authCard}`}>
      <h3>{isLogin ? 'Iniciar sesion' : 'Crear cuenta'}</h3>
      <form
        className={styles.authForm}
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
      >
        <div className={styles.authLeft}>
          <p className={styles.hint}>
            {isLogin
              ? 'Usa tu email y contrasena para ingresar.'
              : 'Crea tu cuenta para acceder al panel.'}
          </p>
          <div className={styles.authRow}>
            <button className={`${styles.primaryButton} ${styles.authAction}`} type="submit" disabled={loading}>
              {loading ? 'Enviando...' : isLogin ? 'Ingresar' : 'Crear cuenta'}
            </button>
          </div>
          <button className={styles.secondaryButton} type="button" onClick={handleSwitch}>
            {isLogin ? 'Crear cuenta' : 'Ya tengo cuenta'}
          </button>
        </div>
        <div className={styles.authRight}>
          <div className={styles.authFields}>
            <label>
              <span>Email</span>
              <input
                type="email"
                autoComplete="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              <span>Contrasena</span>
              <input
                type="password"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                placeholder="Tu contrasena"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {!isLogin && (
              <label>
                <span>Confirmar contrasena</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Repite tu contrasena"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </label>
            )}
          </div>
        </div>
      </form>
      {error && <p className={styles.errorText}>{error}</p>}
    </div>
  );
}
