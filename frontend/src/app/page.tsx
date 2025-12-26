"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import { API_BASE } from "../lib/config";
import type { MeliStatusResponse, PublicationDto } from "../lib/types";
import { CreateOrImport } from "../components/create-or-import";
import { PublicationCard } from "../components/publication-card";
import { clearToken, getToken } from "../lib/auth";
import { authFetch } from "../lib/http";

export default function Home() {
  const router = useRouter();
  const [publications, setPublications] = useState<PublicationDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [meliConnected, setMeliConnected] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [showPaused, setShowPaused] = useState(true);

  const loadData = async (activeToken: string | null) => {
    if (!activeToken) {
      setError("Debes iniciar sesión para ver publicaciones.");
      setPublications([]);
      setMeliConnected(false);
      return;
    }
    try {
      const res = await authFetch(`${API_BASE}/publications`, {
        cache: "no-store",
      });
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Debes iniciar sesión para ver publicaciones.");
        }
        throw new Error("No se pudo cargar el listado de publicaciones");
      }
      const data = await res.json();
      setPublications(data);
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Error cargando publicaciones");
    }

    try {
      const res = await authFetch(`${API_BASE}/meli/status`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setMeliConnected(false);
        return;
      }
      const data = (await res.json()) as MeliStatusResponse;
      setMeliConnected(data.connected);
    } catch {
      setMeliConnected(false);
    }
  };

  useEffect(() => {
    const stored = getToken();
    if (!stored) {
      router.replace("/login");
      return;
    }
    setToken(stored);
    loadData(stored);
  }, [router]);

  useEffect(() => {
    const handleFocus = () => loadData(token);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("visibilitychange", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("visibilitychange", handleFocus);
    };
  }, [token]);

  const handleLogout = () => {
    clearToken();
    setToken(null);
    router.replace("/login");
  };

  const handleConnectMeli = async () => {
    if (!token) {
      setError("Debes iniciar sesión para conectar Mercado Libre.");
      return;
    }
    try {
      const res = await authFetch(`${API_BASE}/meli/auth-url`);
      if (!res.ok) {
        throw new Error("No se pudo iniciar la conexión con Mercado Libre");
      }
      const data = await res.json();
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      setError(err?.message || "No se pudo iniciar la conexión con Mercado Libre");
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>RataLibre · Technical test</p>
          <h1>Publicaciones de Mercado Libre</h1>
          <p className={styles.subtitle}>
            Importa desde ML, guarda en Postgres y genera recomendaciones con IA. Selecciona
            una publicación y corre el análisis.
          </p>
          <div className={styles.actionsRow}>
            <button type="button" className={styles.linkButton} onClick={handleConnectMeli}>
              {meliConnected ? "Reconectar Mercado Libre" : "Conectar Mercado Libre"}
            </button>
            <button type="button" className={styles.secondaryButton} onClick={handleLogout}>
              Cerrar sesion
            </button>
          </div>
        </div>
        <div className={styles.badge}>
          Backend: {API_BASE.replace("http://", "").replace("https://", "")}
        </div>
      </header>

      {!meliConnected && (
        <div className={styles.noticeCard}>
          <div>
            <h3>Conecta tu cuenta de Mercado Libre</h3>
            <p className={styles.subtitle}>
              Para importar y publicar, primero conecta tu cuenta desde el flujo de OAuth.
            </p>
          </div>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => router.push("/connect-ml")}
          >
            Conectar ahora
          </button>
        </div>
      )}

      <CreateOrImport onRefresh={() => loadData(token)} />

      <div className={styles.filterSection}>
        <label>
          <input
            type="checkbox"
            checked={showPaused}
            onChange={(e) => setShowPaused(e.target.checked)}
          />
          Mostrar publicaciones pausadas
        </label>
      </div>

      {error && <p className={styles.errorText}>{error}</p>}

      <section className={styles.grid}>
        {publications.length === 0 && !error && (
          <div className={styles.empty}>
            <p>No hay publicaciones aún.</p>
          </div>
        )}
        {publications
          .filter((pub) => showPaused || !pub.isPausedLocally)
          .map((pub) => (
            <PublicationCard
              publication={pub}
              key={pub.id}
              onDeleted={(id) => {
                setPublications((prev) => prev.filter((p) => p.id !== id));
                loadData(token);
              }}
            />
          ))}
      </section>
    </div>
  );
}
