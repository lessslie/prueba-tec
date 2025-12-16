import { API_BASE } from './config';
import type {
  CreatePublicationInput,
  PublicationDto,
  UpdatePublicationInput,
} from './types';

export async function createPublication(payload: CreatePublicationInput): Promise<PublicationDto> {
  const res = await fetch(`${API_BASE}/publications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Error ${res.status}: ${body || res.statusText}`);
  }

  return res.json();
}

export async function updatePublication(
  id: string,
  payload: UpdatePublicationInput,
): Promise<PublicationDto> {
  const res = await fetch(`${API_BASE}/publications/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Error ${res.status}: ${body || res.statusText}`);
  }

  return res.json();
}

export async function deletePublication(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/publications/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Error ${res.status}: ${body || res.statusText}`);
  }
}

export async function importFromMeli(itemId: string): Promise<PublicationDto> {
  const res = await fetch(`${API_BASE}/meli/import/${itemId}`, { method: 'GET' });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Error ${res.status}: ${body || res.statusText}`);
  }
  return res.json();
}
