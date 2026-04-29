import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateUnitDto {
  @ApiProperty({ example: 'phonics-level-1' })
  @IsString()
  @MinLength(3)
  slug: string;

  @ApiProperty({ example: 'Phonics - Level 1' })
  @IsString()
  @MinLength(3)
  title: string;

  @ApiPropertyOptional({ example: 'Introduction to first phonics lessons.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  curriculumLevel: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  orderIndex: number;

  @ApiPropertyOptional({ example: true, default: false })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
