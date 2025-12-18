'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPublication, importFromMeli } from '../lib/api';
import { API_BASE } from '../lib/config';
import { authFetch } from '../lib/http';
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
  const [slowImport, setSlowImport] = useState(false);
  const [loadingMyItems, setLoadingMyItems] = useState(false);
  const [myItems, setMyItems] = useState<string[]>([]);
  const [profileLabel, setProfileLabel] = useState<string | null>(null);
  const [picturesInput, setPicturesInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [categoryLevels, setCategoryLevels] = useState<{ id: string; name: string }[][]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(false);

  const onChange = (field: keyof CreatePublicationInput, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const loadCategories = async (parentId: string | null, level: number) => {
    setCategoryLoading(true);
    try {
      const url = parentId ? `${API_BASE}/meli/categories?parent=${parentId}` : `${API_BASE}/meli/categories`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error('No se pudieron cargar las categorías');
      const data = await res.json();
      setCategoryLevels((prev) => {
        const next = prev.slice(0, level);
        next[level] = Array.isArray(data) ? data : [];
        return next;
      });
      setSelectedCategories((prev) => prev.slice(0, level));
      if ((!data || data.length === 0) && parentId) {
        setForm((prev) => ({ ...prev, categoryId: parentId }));
      }
    } catch (err: any) {
      setError(err?.message || 'No se pudieron cargar las categorías');
    } finally {
      setCategoryLoading(false);
    }
  };

  const handleSelectCategory = (level: number, value: string) => {
    setForm((prev) => ({ ...prev, categoryId: '' }));
    setSelectedCategories((prev) => {
      const next = prev.slice(0, level);
      if (value) next[level] = value;
      return next;
    });
    if (!value) {
      setCategoryLevels((prev) => prev.slice(0, level));
      return;
    }
    loadCategories(value, level + 1);
  };

  useEffect(() => {
    loadCategories(null, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async () => {
    if (!form.title.trim()) {
      setError('Completa el título para publicar en Mercado Libre.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await createPublication({
        ...form,
        price: Number(form.price),
        availableQuantity: Number(form.availableQuantity),
        soldQuantity: Number(form.soldQuantity),
        pictures: picturesInput
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean),
      });
      setForm(initialForm);
      setSuccess('Publicación creada correctamente.');
      router.refresh();
    } catch (err: any) {
      const msg = err?.message || 'No se pudo crear la publicación';
      setError(msg.includes('Failed to fetch') ? 'No se pudo conectar al servidor.' : msg);
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
    setSlowImport(false);
    setError(null);
    setSuccess(null);
    const timer = setTimeout(() => setSlowImport(true), 6000);
    try {
      await importFromMeli(importId.trim());
      setImportId('');
      setSuccess('Importación en progreso: la publicación fue traída desde Mercado Libre.');
      router.refresh();
    } catch (err: any) {
      const rawMsg = err?.message || 'No se pudo importar desde Mercado Libre';
      const needsAuth =
        rawMsg.includes('401') ||
        rawMsg.includes('Token de Mercado Libre invalido') ||
        rawMsg.toLowerCase().includes('expired');
      const blocked =
        rawMsg.includes('PolicyAgent') ||
        rawMsg.toLowerCase().includes('bloquea este item');
      const forbidden =
        rawMsg.toLowerCase().includes('access_denied') ||
        rawMsg.toLowerCase().includes('no permite acceder a este item');
      setError(
        needsAuth
          ? 'Token expirado o inválido: hacé clic en "Conectar Mercado Libre" y volvé a intentar.'
          : blocked
            ? 'Mercado Libre bloquea este item (PolicyAgent). Probá con otro ID o un item público.'
            : forbidden
              ? 'Mercado Libre no permite acceder a este item (403). Probá con otro ID o revisá permisos.'
              : rawMsg,
      );
    } finally {
      clearTimeout(timer);
      setLoading(false);
      setSlowImport(false);
    }
  };

  const loadMyItems = async () => {
    setLoadingMyItems(true);
    setError(null);
    setSuccess(null);
    try {
      const meRes = await authFetch(`${API_BASE}/meli/me`, {
        cache: 'no-store',
      });
      if (meRes.status === 401) {
        throw new Error('Debes iniciar sesión para ver tu perfil de Mercado Libre.');
      }
      if (meRes.ok) {
        const meData = await meRes.json();
        setProfileLabel(`${meData.nickname || 'Usuario ML'} (#${meData.id})`);
      }
      const res = await authFetch(`${API_BASE}/meli/my-items?limit=50`, {
        cache: 'no-store',
      });
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Debes iniciar sesión para ver tus publicaciones de ML.');
        }
        throw new Error('No se pudieron obtener tus publicaciones de ML');
      }
      const data = await res.json();
      const ids: string[] = Array.isArray(data?.results) ? data.results : [];
      setMyItems(ids);
      if (ids.length > 0) {
        setImportId(ids[0]);
      }
      if (ids.length === 0) {
        setSuccess('No encontramos publicaciones en tu cuenta ML. Crea una y vuelve a intentar.');
      }
    } catch (err: any) {
      setError(err?.message || 'No se pudieron cargar tus publicaciones de ML');
    } finally {
      setLoadingMyItems(false);
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
              placeholder="Esto lo genera ML"
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
            <div className={styles.categoryStack}>
              {categoryLevels.length === 0 && <p className={styles.hint}>Cargando categorías...</p>}
              {categoryLevels.map((cats, idx) => (
                <select
                  key={`cat-level-${idx}`}
                  className={styles.select}
                  value={selectedCategories[idx] || ''}
                  onChange={(e) => handleSelectCategory(idx, e.target.value)}
                  disabled={categoryLoading}
                >
                  <option value="">{idx === 0 ? 'Elige categoría' : 'Elige subcategoría'}</option>
                  {cats.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.id})
                    </option>
                  ))}
                </select>
              ))}
              {categoryLoading && <p className={styles.hint}>Cargando...</p>}
              {form.categoryId && <p className={styles.hint}>Categoría seleccionada: {form.categoryId}</p>}
            </div>
          </label>
          <label>
            <span>ID de categoría manual (hoja)</span>
            <input
              className={styles.select}
              value={form.categoryId}
              onChange={(e) => onChange('categoryId', e.target.value)}
              placeholder="Ej: MLA1055"
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
          <label className={styles.fullRow}>
            <span>Imágenes (URLs públicas, una por línea)</span>
            <textarea
              value={picturesInput}
              onChange={(e) => setPicturesInput(e.target.value)}
              rows={2}
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

      <div className={styles.panelSection}>
        <h3>Mis publicaciones de Mercado Libre</h3>
        <div className={styles.importRow}>
          <button
            className={styles.secondaryButton}
            type="button"
            onClick={loadMyItems}
            disabled={loadingMyItems}
          >
            {loadingMyItems ? 'Cargando...' : 'Cargar mis publicaciones'}
          </button>
          {profileLabel && <span className={styles.badgeSmall}>{profileLabel}</span>}
        </div>
        {myItems.length > 0 && (
          <div className={styles.importRow}>
            <select
              className={styles.select}
              value={importId}
              onChange={(e) => setImportId(e.target.value)}
            >
              {myItems.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
            <button
              className={styles.secondaryButton}
              onClick={handleImport}
              disabled={loading}
              type="button"
            >
              {loading ? 'Importando...' : 'Importar seleccionado'}
            </button>
          </div>
        )}
      </div>

      {error && <p className={styles.errorText}>{error}</p>}
      {slowImport && !error && (
        <p className={styles.errorText}>
          La importación está tardando: puede que Mercado Libre bloquee el item o la API responda lento.
        </p>
      )}
      {success && <p className={styles.successText}>{success}</p>}
    </div>
  );
}
