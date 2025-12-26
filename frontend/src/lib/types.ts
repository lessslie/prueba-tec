export interface PublicationDescriptionDto {
  id: string;
  description: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string | Date;
}

export interface PublicationDto {
  id: string;
  meliItemId: string;
  permalink?: string | null;
  title: string;
  price: number;
  status: string;
  availableQuantity: number;
  soldQuantity: number;
  categoryId: string;
  isPausedLocally: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  descriptions?: PublicationDescriptionDto[];
}

export interface AnalysisResponseDto {
  titleRecommendations: string;
  descriptionIssues: string;
  conversionOpportunities: string;
  commercialRisks: string;
}

export interface CreatePublicationInput {
  meliItemId: string;
  title: string;
  price: number;
  status: string;
  availableQuantity: number;
  soldQuantity: number;
  categoryId: string;
  description?: string;
  pictures?: string[];
}

export interface UpdatePublicationInput extends Partial<CreatePublicationInput> {}

export interface MeliStatusResponse {
  connected: boolean;
}
