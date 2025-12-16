import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CallbackQueryDto {
  @ApiProperty({ description: 'Authorization code returned by Mercado Libre' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({
    description: 'Opaque state passed in the auth request',
    required: false,
  })
  @IsString()
  @IsOptional()
  state?: string;
}
