'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../page.module.css';
import { API_BASE } from '../../lib/config';
import { authFetch } from '../../lib/http';
import { getToken } from '../../lib/auth';
import type { MeliStatusResponse } from '../../lib/types';

export default function ConnectMeliPage() {
  const router = useRouter();
  const [meliConnected, setMeliConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`${API_BASE}/meli/status`, { cache: 'no-store' });
      if (!res.ok) {
        setMeliConnected(false);
        return;
      }
      const data = (await res.json()) as MeliStatusResponse;
      setMeliConnected(Boolean(data.connected));
    } catch (err: any) {
      setError(err?.message || 'No se pudo validar la conexion con Mercado Libre.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const stored = getToken();
    if (!stored) {
      router.replace('/login');
      return;
    }
    loadStatus();
  }, [router]);

  const handleConnect = async () => {
    setError(null);
    try {
      const res = await authFetch(`${API_BASE}/meli/auth-url`);
      if (!res.ok) {
        throw new Error('No se pudo iniciar la conexion con Mercado Libre.');
      }
      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      setError(err?.message || 'No se pudo iniciar la conexion con Mercado Libre.');
    }
  };

  return (
    <div className={`${styles.page} ${styles.authPage}`}>
      <header className={`${styles.hero} ${styles.authHero}`}>
        <div>
          <p className={styles.eyebrow}>RataLibre technical test</p>
          <h1>Conectar Mercado Libre</h1>
          <p className={styles.subtitle}>
            Conecta tu cuenta de Mercado Libre para importar y publicar productos desde el panel.
          </p>
        </div>
        <div className={styles.badge}>
          Backend: {API_BASE.replace('http://', '').replace('https://', '')}
        </div>
      </header>

      <div className={`${styles.actionsPanel} ${styles.authPanel}`}>
        <div className={`${styles.panelSection} ${styles.authCard}`}>
          {meliConnected ? (
            <>
              <h3>Cuenta conectada</h3>
              <p className={styles.hint}>Ya estas conectado a Mercado Libre.</p>
              <button
                className={`${styles.primaryButton} ${styles.bigButton}`}
                type="button"
                onClick={() => router.push('/')}
              >
                Ir al dashboard
              </button>
            </>
          ) : (
            <>
              <h3>Conectar ahora</h3>
              <p className={styles.hint}>
                {loading
                  ? 'Validando estado de conexion...'
                  : 'Necesitas conectar tu cuenta para continuar.'}
              </p>
              <button
                className={`${styles.primaryButton} ${styles.bigButton}`}
                type="button"
                onClick={handleConnect}
                disabled={loading}
              >
                Conectar Mercado Libre
              </button>
            </>
          )}
          {error && <p className={styles.errorText}>{error}</p>}
        </div>
      </div>
    </div>
  );
}
