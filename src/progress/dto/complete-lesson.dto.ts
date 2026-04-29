import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CompleteLessonDto {
  @ApiProperty()
  @IsString()
  @MinLength(10)
  childId: string;
}
