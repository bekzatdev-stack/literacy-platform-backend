import { Module } from '@nestjs/common';
import { UnitsModule } from '../units/units.module';
import { LessonRepository } from './repositories/lesson.repository';
import { LessonsController } from './lessons.controller';
import { LessonsService } from './lessons.service';

@Module({
  imports: [UnitsModule],
  controllers: [LessonsController],
  providers: [LessonsService, LessonRepository],
  exports: [LessonsService, LessonRepository],
})
export class LessonsModule {}
