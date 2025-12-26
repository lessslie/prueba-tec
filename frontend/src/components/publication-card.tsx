'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../app/page.module.css';
import type { PublicationDto, UpdatePublicationInput } from '../lib/types';
import { pausePublication, activatePublication, updatePublication } from '../lib/api';
import { AnalyzeButton } from './analyze-button';

type Props = {
  publication: PublicationDto;
  onDeleted?: (id: string) => void;
};

export function PublicationCard({ publication, onDeleted }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmPause, setConfirmPause] = useState(false);

  const [form, setForm] = useState<UpdatePublicationInput>({
    title: publication.title,
    price: publication.price,
    status: publication.status,
    availableQuantity: publication.availableQuantity,
    soldQuantity: publication.soldQuantity,
    categoryId: publication.categoryId,
    description: publication.descriptions?.[0]?.description ?? '',
  });

  const isActive = (form?.status ?? publication.status)?.toLowerCase() === 'active';

  const onChange = (field: keyof UpdatePublicationInput, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value as any }));
  };

  const handleUpdate = async () => {
    setLoading(true);
    setError(null);
    try {
      await updatePublication(publication.id, {
        ...form,
        price: form.price !== undefined ? Number(form.price) : undefined,
        availableQuantity:
          form.availableQuantity !== undefined ? Number(form.availableQuantity) : undefined,
        soldQuantity: form.soldQuantity !== undefined ? Number(form.soldQuantity) : undefined,
      });
      setEditing(false);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'No se pudo actualizar');
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async () => {
    if (!confirmPause) {
      setConfirmPause(true);
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await pausePublication(publication.id);
      setConfirmPause(false);

      // Mostrar mensaje según si se pausó o no en ML
      if (result.pausedInMeli) {
        setSuccess('Publicación pausada localmente y en Mercado Libre.');
      } else {
        setSuccess('Publicación pausada localmente. No se pudo pausar en Mercado Libre (puede que ya esté pausada o el token haya expirado).');
      }

      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'No se pudo pausar');
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      // Si está editando, guardar cambios primero
      if (editing) {
        await updatePublication(publication.id, {
          ...form,
          price: form.price !== undefined ? Number(form.price) : undefined,
          availableQuantity:
            form.availableQuantity !== undefined ? Number(form.availableQuantity) : undefined,
          soldQuantity: form.soldQuantity !== undefined ? Number(form.soldQuantity) : undefined,
        });
        setEditing(false);
      }

      // Luego activar
      await activatePublication(publication.id);
      setSuccess(editing ? 'Publicación guardada y activada correctamente.' : 'Publicación activada localmente.');
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'No se pudo activar');
    } finally {
      setLoading(false);
    }
  };

  const description = publication.descriptions?.[0]?.description;
  const isPaused = publication.isPausedLocally;

  return (
    <article className={`${styles.card} ${isPaused ? styles.cardPaused : ''}`}>
      <header className={styles.cardHeader}>
        <div>
          <p className={styles.meliId}>
            {publication.meliItemId}
            {isPaused && <span className={styles.pausedBadge}>Pausada en ML</span>}
            {publication.permalink && (
              <>
                {' '}
                ·{' '}
                <a href={publication.permalink} target="_blank" rel="noreferrer">
                  Ver en ML
                </a>
              </>
            )}
          </p>
          <h3>{publication.title}</h3>
        </div>
        <div className={styles.price}>
          ${publication.price.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
        </div>
      </header>

      <dl className={styles.meta}>
        <div>
          <dt>Estado</dt>
          <dd>{publication.status}</dd>
        </div>
        <div>
          <dt>Stock</dt>
          <dd>{publication.availableQuantity}</dd>
        </div>
        <div>
          <dt>Vendidos</dt>
          <dd>{publication.soldQuantity}</dd>
        </div>
        <div>
          <dt>Categoría</dt>
          <dd>{publication.categoryId}</dd>
        </div>
      </dl>

      {description && !editing && (
        <p className={styles.description}>
          {description.length > 220 ? `${description.slice(0, 220)}…` : description}
        </p>
      )}

      {editing && (
        <div className={styles.formGrid}>
          {isPaused ? (
            <p className={styles.hint}>
              Publicación pausada: podés editar todos los campos. Los cambios se guardarán localmente cuando actives la publicación.
            </p>
          ) : (
            <p className={styles.hint}>
              Nota: si el item está activo en Mercado Libre, ML no permite editar precio o stock; esos campos se deshabilitan y solo se guardará localmente.
            </p>
          )}
          <label>
            <span>Título</span>
            <input
              value={form.title ?? ''}
              onChange={(e) => onChange('title', e.target.value)}
            />
          </label>
          <label>
            <span>Precio</span>
            <input
              type="number"
              value={form.price ?? 0}
              onChange={(e) => onChange('price', e.target.value)}
              disabled={isActive && !isPaused}
            />
          </label>
          <label>
            <span>Estado</span>
            <input
              value={form.status ?? ''}
              onChange={(e) => onChange('status', e.target.value)}
            />
          </label>
          <label>
            <span>Stock</span>
            <input
              type="number"
              value={form.availableQuantity ?? 0}
              onChange={(e) => onChange('availableQuantity', e.target.value)}
              disabled={isActive && !isPaused}
            />
          </label>
          <label>
            <span>Vendidos</span>
            <input
              type="number"
              value={form.soldQuantity ?? 0}
              onChange={(e) => onChange('soldQuantity', e.target.value)}
            />
          </label>
          <label>
            <span>Categoría</span>
            <input
              value={form.categoryId ?? ''}
              onChange={(e) => onChange('categoryId', e.target.value)}
            />
          </label>
          <label className={styles.fullRow}>
            <span>Descripción</span>
            <textarea
              rows={3}
              value={form.description ?? ''}
              onChange={(e) => onChange('description', e.target.value)}
            />
          </label>
        </div>
      )}

      <div className={styles.cardActions}>
        <button className={styles.secondaryButton} type="button" onClick={() => setEditing((prev) => !prev)}>
          {editing ? 'Cancelar' : 'Editar'}
        </button>
        {isPaused ? (
          <button className={styles.primaryButton} type="button" onClick={handleActivate} disabled={loading}>
            {loading ? 'Activando...' : editing ? 'Guardar y Activar' : 'Activar'}
          </button>
        ) : (
          <button className={styles.dangerButton} type="button" onClick={handlePause} disabled={loading}>
            Pausar en ML
          </button>
        )}
      </div>

      {!isPaused && (
        <>
          {editing ? (
            <button
              className={styles.primaryButton}
              onClick={handleUpdate}
              disabled={loading}
              type="button"
            >
              {loading ? 'Guardando...' : 'Guardar cambios'}
            </button>
          ) : (
            <AnalyzeButton publicationId={publication.id} />
          )}
        </>
      )}

      {error && <p className={styles.errorText}>{error}</p>}
      {success && <p className={styles.successText}>{success}</p>}

      {confirmPause && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalContent}>
            <h4>¿Pausar esta publicación?</h4>
            <p className={styles.hint} style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
              Se pausará localmente y se intentará pausar en Mercado Libre.
              <br />
              <strong>Nota:</strong> La publicación no se elimina, solo se marca como pausada.
            </p>
            <div className={styles.modalActions}>
              <button
                className={styles.secondaryButton}
                onClick={() => setConfirmPause(false)}
                type="button"
              >
                Cancelar
              </button>
              <button className={styles.dangerButton} onClick={handlePause} type="button" disabled={loading}>
                {loading ? 'Pausando...' : 'Sí, pausar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
