import { API_BASE } from './config';
import type {
  CreatePublicationInput,
  PublicationDto,
  UpdatePublicationInput,
} from './types';

async function buildError(res: Response): Promise<Error> {
  const text = await res.text();
  try {
    const data = JSON.parse(text);
    const message = Array.isArray(data?.message)
      ? data.message.join('; ')
      : data?.message || data?.error || res.statusText;
    return new Error(`Error ${res.status}: ${message}`);
  } catch {
    return new Error(`Error ${res.status}: ${text || res.statusText}`);
  }
}

export async function createPublication(payload: CreatePublicationInput): Promise<PublicationDto> {
  const res = await fetch(`${API_BASE}/publications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw await buildError(res);
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
    throw await buildError(res);
  }

  return res.json();
}

export async function deletePublication(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/publications/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    throw await buildError(res);
  }
}

export async function importFromMeli(itemId: string): Promise<PublicationDto> {
  const res = await fetch(`${API_BASE}/meli/import/${itemId}`, { method: 'GET' });
  if (!res.ok) {
    throw await buildError(res);
  }
  return res.json();
}
