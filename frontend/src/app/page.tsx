'use client';

import Link from 'next/link';
import styles from './landing.module.css';

export default function LandingPage() {
  return (
    <div className={styles.landingPage}>
      {/* Header/Navigation */}
      <header className={styles.header}>
        <div className={styles.logo}>MeliInsights</div>
        <div className={styles.headerActions}>
          <Link href="/login" className={styles.loginButton}>
            Iniciar Sesión
          </Link>
          <Link href="/register" className={styles.signupButton}>
            Crear Cuenta
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className={styles.hero}>
        <span className={styles.eyebrow}>AI-Powered Analytics</span>
        <h1 className={styles.heroTitle}>
          Optimiza tus ventas en Mercado Libre con Inteligencia Artificial
        </h1>
        <p className={styles.heroSubtitle}>
          Conecta tu cuenta, importa tus publicaciones y obtén recomendaciones personalizadas
          impulsadas por IA para mejorar títulos, descripciones, precios y más.
        </p>
        <div className={styles.ctaButtons}>
          <Link href="/register" className={styles.primaryCta}>
            Comenzar Gratis
          </Link>
          <Link href="/login" className={styles.secondaryCta}>
            Iniciar Sesión
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className={styles.featuresSection}>
        <div className={styles.featuresContainer}>
          <h2 className={styles.sectionTitle}>
            Todo lo que necesitas para vender mejor
          </h2>
          <p className={styles.sectionSubtitle}>
            Herramientas profesionales para optimizar tus publicaciones y aumentar tus ventas
          </p>

          <div className={styles.featuresGrid}>
            <div className={styles.featureCard}>
              <span className={styles.featureIcon}>🔐</span>
              <h3 className={styles.featureTitle}>Conexión Segura OAuth2</h3>
              <p className={styles.featureDescription}>
                Conecta tu cuenta de Mercado Libre de forma segura con autenticación OAuth2.
                Tus credenciales nunca son compartidas.
              </p>
            </div>

            <div className={styles.featureCard}>
              <span className={styles.featureIcon}>📥</span>
              <h3 className={styles.featureTitle}>Importación Automática</h3>
              <p className={styles.featureDescription}>
                Sincroniza todas tus publicaciones existentes en segundos. No necesitas cargar
                nada manualmente.
              </p>
            </div>

            <div className={styles.featureCard}>
              <span className={styles.featureIcon}>🤖</span>
              <h3 className={styles.featureTitle}>Análisis con IA</h3>
              <p className={styles.featureDescription}>
                OpenAI GPT-4 analiza cada publicación y genera recomendaciones específicas para
                optimizar ventas.
              </p>
            </div>

            <div className={styles.featureCard}>
              <span className={styles.featureIcon}>📝</span>
              <h3 className={styles.featureTitle}>Editor Integrado</h3>
              <p className={styles.featureDescription}>
                Edita títulos, precios, stock y descripciones directamente desde la plataforma
                con sincronización en tiempo real.
              </p>
            </div>

            <div className={styles.featureCard}>
              <span className={styles.featureIcon}>⏸️</span>
              <h3 className={styles.featureTitle}>Gestión de Estado</h3>
              <p className={styles.featureDescription}>
                Pausa y reactiva publicaciones con un click. Edita mientras están pausadas y
                activa cuando estés listo.
              </p>
            </div>

            <div className={styles.featureCard}>
              <span className={styles.featureIcon}>📊</span>
              <h3 className={styles.featureTitle}>Dashboard Intuitivo</h3>
              <p className={styles.featureDescription}>
                Visualiza todas tus publicaciones en un panel centralizado con filtros,
                búsqueda y organización inteligente.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaContainer}>
          <h2 className={styles.ctaTitle}>
            ¿Listo para vender más?
          </h2>
          <p className={styles.ctaText}>
            Únete hoy y comienza a optimizar tus publicaciones con inteligencia artificial
          </p>
          <Link href="/register" className={styles.primaryCta}>
            Crear Cuenta Gratis
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContainer}>
          <p className={styles.footerText}>
            © 2025 MeliInsights. Hecho con ❤️ y ☕
          </p>
          <div className={styles.footerLinks}>
            <a href="https://github.com/lessslie/prueba-tec" className={styles.footerLink} target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
            <a href="https://prueba-tec-rmp9.onrender.com/api/docs" className={styles.footerLink} target="_blank" rel="noopener noreferrer">
              API Docs
            </a>
            <a href="https://linkedin.com/in/agata-morales" className={styles.footerLink} target="_blank" rel="noopener noreferrer">
              LinkedIn
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
