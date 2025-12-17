export interface PublicationSummary {
  id: string;
  meliItemId: string;
  title: string;
  price: number;
  status: string;
  availableQuantity: number;
  soldQuantity: number;
  categoryId: string;
}

export interface MeliPublicationPayload {
  meliItemId: string;
  permalink?: string | null;
  title: string;
  price: number;
  status: string;
  availableQuantity: number;
  soldQuantity: number;
  categoryId: string;
  description?: string;
  metadata?: Record<string, unknown> | null;
}

