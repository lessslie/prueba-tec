import styles from "./page.module.css";
import { API_BASE } from "../lib/config";
import type { PublicationDto } from "../lib/types";
import { AnalyzeButton } from "../components/analyze-button";

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
        </div>
        <div className={styles.badge}>
          Backend: {API_BASE.replace("http://", "").replace("https://", "")}
        </div>
      </header>

      {error && <p className={styles.errorText}>{error}</p>}

      <section className={styles.grid}>
        {publications.length === 0 && !error && (
          <div className={styles.empty}>
            <p>No hay publicaciones aún. Importa una desde /meli/import/:itemId.</p>
          </div>
        )}
        {publications.map((pub) => {
          const description = pub.descriptions?.[0]?.description;
          return (
            <article className={styles.card} key={pub.id}>
              <header className={styles.cardHeader}>
                <div>
                  <p className={styles.meliId}>{pub.meliItemId}</p>
                  <h3>{pub.title}</h3>
                </div>
                <div className={styles.price}>
                  ${pub.price.toLocaleString("es-AR", { minimumFractionDigits: 0 })}
                </div>
              </header>
              <dl className={styles.meta}>
                <div>
                  <dt>Estado</dt>
                  <dd>{pub.status}</dd>
                </div>
                <div>
                  <dt>Stock</dt>
                  <dd>{pub.availableQuantity}</dd>
                </div>
                <div>
                  <dt>Vendidos</dt>
                  <dd>{pub.soldQuantity}</dd>
                </div>
                <div>
                  <dt>Categoría</dt>
                  <dd>{pub.categoryId}</dd>
                </div>
              </dl>
              {description && (
                <p className={styles.description}>
                  {description.length > 220 ? `${description.slice(0, 220)}…` : description}
                </p>
              )}
              <AnalyzeButton publicationId={pub.id} />
            </article>
          );
        })}
      </section>
    </div>
  );
}
