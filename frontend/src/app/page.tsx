import styles from "./page.module.css";
import { API_BASE } from "../lib/config";
import type { MeliStatusResponse, PublicationDto } from "../lib/types";
import { AnalyzeButton } from "../components/analyze-button";
import { CreateOrImport } from "../components/create-or-import";
import { PublicationCard } from "../components/publication-card";

async function fetchPublications(): Promise<PublicationDto[]> {
  const res = await fetch(`${API_BASE}/publications`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("No se pudo cargar el listado de publicaciones");
  }
  return res.json();
}

async function fetchMeliStatus(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/meli/status`, { cache: "no-store" });
    if (!res.ok) return false;
    const data = (await res.json()) as MeliStatusResponse;
    return data.connected;
  } catch {
    return false;
  }
}

export default async function Home() {
  let publications: PublicationDto[] = [];
  let error: string | null = null;
  let meliConnected = false;

  try {
    publications = await fetchPublications();
    meliConnected = await fetchMeliStatus();
  } catch (err: any) {
    error = err?.message || "Error cargando publicaciones";
  }

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
            {meliConnected && (
              <span className={styles.linkButton}>Cuenta Mercado Libre conectada</span>
            )}
            <a className={styles.linkButton} href={`${API_BASE}/meli/auth`}>
              {meliConnected ? 'Reconectar Mercado Libre' : 'Conectar Mercado Libre'}
            </a>
          </div>
        </div>
        <div className={styles.badge}>
          Backend: {API_BASE.replace("http://", "").replace("https://", "")}
        </div>
      </header>

      <CreateOrImport />

      {error && <p className={styles.errorText}>{error}</p>}

      <section className={styles.grid}>
        {publications.length === 0 && !error && (
          <div className={styles.empty}>
            <p>No hay publicaciones aún. Importa una desde /meli/import/:itemId.</p>
          </div>
        )}
        {publications.map((pub) => (
          <PublicationCard publication={pub} key={pub.id} />
        ))}
      </section>
    </div>
  );
}
