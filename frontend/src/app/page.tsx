import styles from "./page.module.css";
import { API_BASE } from "../lib/config";
import type { PublicationDto } from "../lib/types";
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

export default async function Home() {
  let publications: PublicationDto[] = [];
  let error: string | null = null;

  try {
    publications = await fetchPublications();
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
          <a className={styles.linkButton} href={`${API_BASE}/meli/auth`}>
            Conectar Mercado Libre
          </a>
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
