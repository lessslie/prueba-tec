import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, MinLength } from 'class-validator';

export class AuthCredentialsDto {
  @ApiProperty({
    example: 'usuario@ejemplo.com',
    description: 'Email del usuario',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'MiPassword123',
    description: 'Contrasena con al menos 6 caracteres',
  })
  @MinLength(6)
  password!: string;
}
