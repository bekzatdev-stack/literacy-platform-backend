import { ApiPropertyOptional } from '@nestjs/swagger';
import { DifficultyLevel, ExerciseType } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateExerciseDto {
  @ApiPropertyOptional({ enum: ExerciseType })
  @IsOptional()
  @IsEnum(ExerciseType)
  type?: ExerciseType;

  @ApiPropertyOptional({ enum: DifficultyLevel })
  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficulty?: DifficultyLevel;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  orderIndex?: number;

  @ApiPropertyOptional({ example: 'Updated prompt.' })
  @IsOptional()
  @IsString()
  prompt?: string;

  @ApiPropertyOptional({ example: 'Updated instructions.' })
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiPropertyOptional({
    example: {
      question: 'Updated question',
      options: ['a', 'b'],
    },
  })
  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>;

  @ApiPropertyOptional({
    example: {
      correctOption: 'a',
    },
  })
  @IsOptional()
  @IsObject()
  correctAnswer?: Record<string, unknown>;
}
