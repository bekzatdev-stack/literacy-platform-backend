import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateChildDto {
  @ApiProperty({ example: 'ali_reader' })
  @IsString()
  @Length(3, 30)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'username can contain only letters, numbers, and underscores',
  })
  username: string;

  @ApiProperty({ example: '1234' })
  @IsString()
  @Length(4, 10)
  @Matches(/^[0-9]+$/, {
    message: 'pin must contain only digits',
  })
  pin: string;

  @ApiProperty({ example: 'Ali' })
  @IsString()
  @MinLength(2)
  displayName: string;

  @ApiProperty({ example: 6 })
  @IsInt()
  @Min(3)
  @Max(12)
  age: number;

  @ApiPropertyOptional({ example: 'https://example.com/avatar-1.png' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  learningLevel?: number = 1;
}
