import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsObject, IsString, Min, MinLength } from 'class-validator';

export class SubmitExerciseDto {
  @ApiProperty()
  @IsString()
  @MinLength(10)
  childId: string;

  @ApiProperty({
    example: {
      correctOption: 'a',
    },
  })
  @IsObject()
  answer: Record<string, unknown>;

  @ApiProperty({ example: 12 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  timeTakenSeconds: number;
}
