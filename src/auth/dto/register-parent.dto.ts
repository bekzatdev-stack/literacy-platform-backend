import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterParentDto {
  @ApiProperty({ example: 'parent@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass123' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Aruzhan' })
  @IsString()
  @MinLength(2)
  firstName: string;

  @ApiPropertyOptional({ example: 'Bekova' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  lastName?: string;
}
