'use client';

import { useEffect, useState } from 'react';
import styles from './page.module.css';
import { clearSessionExpired, getSessionExpiredEventName, isSessionExpired } from '../lib/auth';

export function SessionExpiredModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const sync = () => setOpen(isSessionExpired());
    sync();
    const eventName = getSessionExpiredEventName();
    window.addEventListener(eventName, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(eventName, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  if (!open) return null;

  const handleLogin = () => {
    clearSessionExpired();
    window.location.assign('/login');
  };

  const handleClose = () => {
    clearSessionExpired();
    setOpen(false);
  };

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modalContent}>
        <h3 className={styles.modalTitle}>Sesión expirada</h3>
        <p>Tu sesión venció. Por favor, vuelve a iniciar sesión para continuar.</p>
        <div className={styles.modalActions}>
          <button className={styles.secondaryButton} type="button" onClick={handleClose}>
            Cerrar
          </button>
          <button className={styles.primaryButton} type="button" onClick={handleLogin}>
            Iniciar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
