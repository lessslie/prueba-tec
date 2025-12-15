import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreatePublicationDto {
  @IsString()
  @IsNotEmpty()
  meliItemId!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsNumber()
  price!: number;

  @IsString()
  status!: string;

  @IsInt()
  availableQuantity!: number;

  @IsInt()
  soldQuantity!: number;

  @IsString()
  categoryId!: string;

  @IsString()
  @IsOptional()
  description?: string;
}


