import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ImportItemParamsDto {
  @ApiProperty({
    description: 'Mercado Libre item ID (e.g., MLA123456789) or product ID',
    example: 'MLA123456789',
  })
  @IsString()
  @IsNotEmpty()
  itemId!: string;
}
