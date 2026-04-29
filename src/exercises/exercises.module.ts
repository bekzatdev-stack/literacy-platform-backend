import { Module } from '@nestjs/common';
import { LessonsModule } from '../lessons/lessons.module';
import { ExerciseRepository } from './repositories/exercise.repository';
import { ExercisesController } from './exercises.controller';
import { ExercisesService } from './exercises.service';

@Module({
  imports: [LessonsModule],
  controllers: [ExercisesController],
  providers: [ExercisesService, ExerciseRepository],
  exports: [ExercisesService, ExerciseRepository],
})
export class ExercisesModule {}
