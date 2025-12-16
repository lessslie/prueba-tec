'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../app/page.module.css';
import type { PublicationDto, UpdatePublicationInput } from '../lib/types';
import { deletePublication, updatePublication } from '../lib/api';
import { AnalyzeButton } from './analyze-button';

type Props = {
  publication: PublicationDto;
};

export function PublicationCard({ publication }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<UpdatePublicationInput>({
    title: publication.title,
    price: publication.price,
    status: publication.status,
    availableQuantity: publication.availableQuantity,
    soldQuantity: publication.soldQuantity,
    categoryId: publication.categoryId,
    description: publication.descriptions?.[0]?.description ?? '',
  });

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

  const handleDelete = async () => {
    const confirm = window.confirm('¿Eliminar esta publicación?');
    if (!confirm) return;
    setLoading(true);
    setError(null);
    try {
      await deletePublication(publication.id);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'No se pudo eliminar');
    } finally {
      setLoading(false);
    }
  };

  const description = publication.descriptions?.[0]?.description;

  return (
    <article className={styles.card}>
      <header className={styles.cardHeader}>
        <div>
          <p className={styles.meliId}>{publication.meliItemId}</p>
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
        <button
          className={styles.secondaryButton}
          type="button"
          onClick={() => setEditing((prev) => !prev)}
        >
          {editing ? 'Cancelar' : 'Editar'}
        </button>
        <button
          className={styles.dangerButton}
          type="button"
          onClick={handleDelete}
          disabled={loading}
        >
          Eliminar
        </button>
      </div>

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

      {error && <p className={styles.errorText}>{error}</p>}
    </article>
  );
}
