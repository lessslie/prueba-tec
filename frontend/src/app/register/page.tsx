'use client';

import styles from '../page.module.css';
import { API_BASE } from '../../lib/config';
import { AuthForm } from '../../components/auth-form';

export default function RegisterPage() {
  return (
    <div className={`${styles.page} ${styles.authPage}`}>
      <header className={`${styles.hero} ${styles.authHero}`}>
        <div>
          <p className={styles.eyebrow}>RataLibre technical test</p>
          <h1>Crear cuenta</h1>
          <p className={styles.subtitle}>
            Registrate con tu email para acceder a las publicaciones de Mercado Libre.
          </p>
        </div>
        <div className={styles.badge}>
          Backend: {API_BASE.replace('http://', '').replace('https://', '')}
        </div>
      </header>

      <div className={`${styles.actionsPanel} ${styles.authPanel}`}>
        <AuthForm mode="signup" />
      </div>
    </div>
  );
}
