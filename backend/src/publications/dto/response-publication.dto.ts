import { ApiProperty } from '@nestjs/swagger';

export class ResponsePublicationDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id!: string;

  @ApiProperty({ example: 'MLA123456789' })
  meliItemId!: string;

  @ApiProperty({ example: 'https://articulo.mercadolibre.com.ar/MLA123456789' })
  permalink?: string | null;

  @ApiProperty({ example: 'iPhone 13 Pro Max 256GB' })
  title!: string;

  @ApiProperty({ example: 129999.99 })
  price!: number;

  @ApiProperty({ example: 'active' })
  status!: string;

  @ApiProperty({ example: 5 })
  availableQuantity!: number;

  @ApiProperty({ example: 10 })
  soldQuantity!: number;

  @ApiProperty({ example: 'MLA1051' })
  categoryId!: string;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2024-01-15T10:30:00Z' })
  updatedAt!: Date;
}
