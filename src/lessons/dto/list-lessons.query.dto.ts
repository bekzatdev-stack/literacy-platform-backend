import { ApiPropertyOptional } from '@nestjs/swagger';
import { DifficultyLevel, ExerciseType, LessonStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListLessonsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unitId?: string;

  @ApiPropertyOptional({ enum: ExerciseType })
  @IsOptional()
  @IsEnum(ExerciseType)
  lessonType?: ExerciseType;

  @ApiPropertyOptional({ enum: DifficultyLevel })
  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficulty?: DifficultyLevel;

  @ApiPropertyOptional({ enum: LessonStatus })
  @IsOptional()
  @IsEnum(LessonStatus)
  status?: LessonStatus;

  @ApiPropertyOptional({ example: 'title' })
  @IsOptional()
  @IsString()
  sort_by?: 'title' | 'orderIndex' | 'createdAt' = 'orderIndex';

  @ApiPropertyOptional({ example: 'asc' })
  @IsOptional()
  @IsString()
  sort_order?: 'asc' | 'desc' = 'asc';

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  curriculumLevel?: number;
}
