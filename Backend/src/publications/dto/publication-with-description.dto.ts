import { ApiProperty } from '@nestjs/swagger';
import { ResponsePublicationDto } from './response-publication.dto';

export class PublicationDescriptionDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ example: 'Descripción completa del producto...' })
  description!: string;

  @ApiProperty({ example: { attributes: [] }, required: false })
  metadata?: Record<string, unknown> | null;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  createdAt!: Date;
}

export class PublicationWithDescriptionDto extends ResponsePublicationDto {
  @ApiProperty({ type: [PublicationDescriptionDto], required: false })
  descriptions?: PublicationDescriptionDto[];
}

