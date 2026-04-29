import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DifficultyLevel, ExerciseType, LessonStatus } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateLessonDto {
  @ApiProperty({ example: 'letter-a-sounds' })
  @IsString()
  @MinLength(3)
  slug: string;

  @ApiProperty({ example: 'Letter A Sounds' })
  @IsString()
  @MinLength(3)
  title: string;

  @ApiPropertyOptional({ example: 'Listen and match the A sound.' })
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiProperty({ enum: ExerciseType, example: ExerciseType.PHONICS })
  @IsEnum(ExerciseType)
  lessonType: ExerciseType;

  @ApiProperty({ enum: DifficultyLevel, example: DifficultyLevel.BEGINNER })
  @IsEnum(DifficultyLevel)
  difficulty: DifficultyLevel;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  orderIndex: number;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  xpReward?: number = 10;

  @ApiPropertyOptional({ enum: LessonStatus, example: LessonStatus.DRAFT })
  @IsOptional()
  @IsEnum(LessonStatus)
  status?: LessonStatus;
}
