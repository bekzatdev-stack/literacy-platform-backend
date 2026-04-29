import { Module } from '@nestjs/common';
import { ChildrenModule } from '../children/children.module';
import { ExerciseRepository } from '../exercises/repositories/exercise.repository';
import { LessonRepository } from '../lessons/repositories/lesson.repository';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';
import { ProgressRepository } from './repositories/progress.repository';

@Module({
  imports: [ChildrenModule],
  controllers: [ProgressController],
  providers: [
    ProgressService,
    ProgressRepository,
    ExerciseRepository,
    LessonRepository,
  ],
  exports: [ProgressService, ProgressRepository],
})
export class ProgressModule {}
