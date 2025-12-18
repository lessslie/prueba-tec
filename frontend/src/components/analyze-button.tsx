'use client';

import { useState } from 'react';
import { API_BASE } from '../lib/config';
import { getAuthHeaders } from '../lib/auth';
import type { AnalysisResponseDto } from '../lib/types';
import styles from '../app/page.module.css';

type Props = {
  publicationId: string;
};

export function AnalyzeButton({ publicationId }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResponseDto | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE}/analysis/publication/${publicationId}?force=false`,
        { cache: 'no-store', headers: getAuthHeaders() },
      );
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Debes iniciar sesión para ejecutar el análisis.');
        }
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }
      const data = (await res.json()) as AnalysisResponseDto;
      setResult(data);
    } catch (err: any) {
      setError(err?.message || 'No se pudo obtener el análisis');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.analyzeBlock}>
      <button
        className={styles.primaryButton}
        disabled={loading}
        onClick={handleAnalyze}
        type="button"
      >
        {loading ? 'Analizando...' : 'Analizar publicación'}
      </button>
      {error && <p className={styles.errorText}>{error}</p>}
      {result && (
        <div className={styles.analysisCard}>
          <p><strong>Título:</strong> {result.titleRecommendations}</p>
          <p><strong>Descripción:</strong> {result.descriptionIssues}</p>
          <p><strong>Oportunidades:</strong> {result.conversionOpportunities}</p>
          <p><strong>Riesgos:</strong> {result.commercialRisks}</p>
        </div>
      )}
    </div>
  );
}
