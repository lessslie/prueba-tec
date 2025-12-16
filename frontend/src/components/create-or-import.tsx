'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPublication, importFromMeli } from '../lib/api';
import styles from '../app/page.module.css';
import type { CreatePublicationInput } from '../lib/types';

const initialForm: CreatePublicationInput = {
  meliItemId: '',
  title: '',
  price: 0,
  status: 'active',
  availableQuantity: 0,
  soldQuantity: 0,
  categoryId: '',
  description: '',
};

export function CreateOrImport() {
  const router = useRouter();
  const [form, setForm] = useState<CreatePublicationInput>(initialForm);
  const [importId, setImportId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onChange = (field: keyof CreatePublicationInput, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      await createPublication({
        ...form,
        price: Number(form.price),
        availableQuantity: Number(form.availableQuantity),
        soldQuantity: Number(form.soldQuantity),
      });
      setForm(initialForm);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'No se pudo crear la publicación');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!importId.trim()) {
      setError('Ingresa un itemId o productId de Mercado Libre');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await importFromMeli(importId.trim());
      setImportId('');
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'No se pudo importar desde Mercado Libre');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.actionsPanel}>
      <div className={styles.panelSection}>
        <h3>Crear publicación manual</h3>
        <div className={styles.formGrid}>
          <label>
            <span>Item ID (ML)</span>
            <input
              value={form.meliItemId}
              onChange={(e) => onChange('meliItemId', e.target.value)}
              placeholder="MLA123..."
            />
          </label>
          <label>
            <span>Título</span>
            <input
              value={form.title}
              onChange={(e) => onChange('title', e.target.value)}
              placeholder="Título"
            />
          </label>
          <label>
            <span>Precio</span>
            <input
              type="number"
              value={form.price}
              onChange={(e) => onChange('price', e.target.value)}
              min="0"
            />
          </label>
          <label>
            <span>Estado</span>
            <input
              value={form.status}
              onChange={(e) => onChange('status', e.target.value)}
              placeholder="active, paused..."
            />
          </label>
          <label>
            <span>Stock</span>
            <input
              type="number"
              value={form.availableQuantity}
              onChange={(e) => onChange('availableQuantity', e.target.value)}
              min="0"
            />
          </label>
          <label>
            <span>Vendidos</span>
            <input
              type="number"
              value={form.soldQuantity}
              onChange={(e) => onChange('soldQuantity', e.target.value)}
              min="0"
            />
          </label>
          <label>
            <span>Categoría</span>
            <input
              value={form.categoryId}
              onChange={(e) => onChange('categoryId', e.target.value)}
              placeholder="MLA1051..."
            />
          </label>
          <label className={styles.fullRow}>
            <span>Descripción</span>
            <textarea
              value={form.description}
              onChange={(e) => onChange('description', e.target.value)}
              rows={3}
            />
          </label>
        </div>
        <button
          className={styles.primaryButton}
          onClick={handleCreate}
          disabled={loading}
          type="button"
        >
          {loading ? 'Enviando...' : 'Crear publicación'}
        </button>
      </div>

      <div className={styles.panelSection}>
        <h3>Importar desde Mercado Libre</h3>
        <div className={styles.importRow}>
          <input
            value={importId}
            onChange={(e) => setImportId(e.target.value)}
            placeholder="Item ID o Product ID (MLA123...)"
          />
          <button
            className={styles.secondaryButton}
            onClick={handleImport}
            disabled={loading}
            type="button"
          >
            {loading ? 'Importando...' : 'Importar'}
          </button>
        </div>
      </div>

      {error && <p className={styles.errorText}>{error}</p>}
    </div>
  );
}
