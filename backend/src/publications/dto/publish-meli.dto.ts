import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, IsUrl } from 'class-validator';

export class PublishMeliDto {
  @ApiProperty({ example: 'MLATEST003', description: 'Opcional: identificador interno' })
  @IsString()
  @IsOptional()
  meliItemId?: string;

  @ApiProperty({ example: 'Cortina LED cálida 3x2m con 240 luces' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: 15000 })
  @IsNumber()
  price!: number;

  @ApiProperty({ example: 10 })
  @IsNumber()
  availableQuantity!: number;

  @ApiProperty({ example: 'MLA3530', description: 'Categoría hoja de Mercado Libre' })
  @IsString()
  @IsNotEmpty()
  categoryId!: string;

  @ApiProperty({
    example: 'Descripción del producto',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'active', required: false })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({ example: 0, required: false })
  @IsNumber()
  @IsOptional()
  soldQuantity?: number;

  @ApiProperty({
    example: ['https://http2.mlstatic.com/storage/developers-site-cms-admin/openapi/319968618063-test_image.jpg'],
    required: false,
    description: 'URLs públicas de imágenes (ML las descarga desde ahí)',
    type: [String],
  })
  @IsArray()
  @IsOptional()
  @IsUrl({}, { each: true })
  pictures?: string[];
}
