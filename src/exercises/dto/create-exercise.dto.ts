import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DifficultyLevel, ExerciseType } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateExerciseDto {
  @ApiProperty({ enum: ExerciseType, example: ExerciseType.PHONICS })
  @IsEnum(ExerciseType)
  type: ExerciseType;

  @ApiProperty({ enum: DifficultyLevel, example: DifficultyLevel.BEGINNER })
  @IsEnum(DifficultyLevel)
  difficulty: DifficultyLevel;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  orderIndex: number;

  @ApiProperty({ example: 'Match the letter A with its sound.' })
  @IsString()
  prompt: string;

  @ApiPropertyOptional({
    example: 'Listen carefully before selecting the answer.',
  })
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiProperty({
    example: {
      question: 'Which sound matches the letter A?',
      options: ['a', 'b', 'c'],
    },
  })
  @IsObject()
  content: Record<string, unknown>;

  @ApiPropertyOptional({
    example: {
      correctOption: 'a',
    },
  })
  @IsOptional()
  @IsObject()
  correctAnswer?: Record<string, unknown>;
}
