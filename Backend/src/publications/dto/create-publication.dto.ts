import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePublicationDto {
  @ApiProperty({ example: 'MLA123456789', description: 'Mercado Libre item ID' })
  @IsString()
  @IsNotEmpty()
  meliItemId!: string;

  @ApiProperty({ example: 'Producto de prueba', description: 'Título de la publicación' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: 12345.67, description: 'Precio actual del producto' })
  @IsNumber()
  price!: number;

  @ApiProperty({ example: 'active', description: 'Estado de la publicación en Mercado Libre' })
  @IsString()
  status!: string;

  @ApiProperty({ example: 10, description: 'Cantidad disponible' })
  @IsInt()
  availableQuantity!: number;

  @ApiProperty({ example: 3, description: 'Cantidad vendida' })
  @IsInt()
  soldQuantity!: number;

  @ApiProperty({ example: 'MLA1051', description: 'ID de categoría de Mercado Libre' })
  @IsString()
  categoryId!: string;

  @ApiProperty({
    example: 'Descripción de prueba del producto.',
    description: 'Descripción larga de la publicación',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;
}


