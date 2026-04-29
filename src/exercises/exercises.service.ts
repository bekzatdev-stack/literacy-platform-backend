import { Injectable, NotFoundException } from '@nestjs/common';
import { AdminAction, ContentEntityType, Prisma } from '@prisma/client';
import { AdminActivityService } from '../admin-activity/admin-activity.service';
import type { AuthUser } from '../auth/interfaces/auth-user.interface';
import { LessonsService } from '../lessons/lessons.service';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { UpdateExerciseDto } from './dto/update-exercise.dto';
import { ExerciseRepository } from './repositories/exercise.repository';

@Injectable()
export class ExercisesService {
  constructor(
    private readonly exerciseRepository: ExerciseRepository,
    private readonly lessonsService: LessonsService,
    private readonly adminActivityService: AdminActivityService,
  ) {}

  async createExercise(
    currentUser: AuthUser,
    lessonId: string,
    createExerciseDto: CreateExerciseDto,
  ) {
    await this.lessonsService.getLessonById(lessonId);

    const createdExercise = await this.exerciseRepository.create({
      type: createExerciseDto.type,
      difficulty: createExerciseDto.difficulty,
      orderIndex: createExerciseDto.orderIndex,
      prompt: createExerciseDto.prompt,
      promptTranslations: this.buildTranslations(createExerciseDto.prompt),
      instructions: createExerciseDto.instructions,
      instructionsTranslations: createExerciseDto.instructions
        ? this.buildTranslations(createExerciseDto.instructions)
        : undefined,
      content: createExerciseDto.content as Prisma.InputJsonValue,
      correctAnswer: createExerciseDto.correctAnswer as Prisma.InputJsonValue,
      createdById: currentUser.sub,
      updatedById: currentUser.sub,
      lesson: {
        connect: {
          id: lessonId,
        },
      },
    });

    await this.adminActivityService.log({
      adminId: currentUser.sub,
      action: AdminAction.CREATE,
      entityType: ContentEntityType.EXERCISE,
      entityId: createdExercise.id,
      afterData: createdExercise,
    });

    return createdExercise;
  }

  async listExercises(currentUser: AuthUser, lessonId: string) {
    await this.lessonsService.getLessonById(lessonId);
    return this.exerciseRepository.listByLesson(currentUser, lessonId);
  }

  async updateExercise(
    currentUser: AuthUser,
    exerciseId: string,
    updateExerciseDto: UpdateExerciseDto,
  ) {
    const exercise = await this.exerciseRepository.findById(exerciseId);

    if (!exercise) {
      throw new NotFoundException('Exercise not found');
    }

    const updatedExercise = await this.exerciseRepository.update(exerciseId, {
      ...(updateExerciseDto.type ? { type: updateExerciseDto.type } : {}),
      ...(updateExerciseDto.difficulty
        ? { difficulty: updateExerciseDto.difficulty }
        : {}),
      ...(typeof updateExerciseDto.orderIndex === 'number'
        ? { orderIndex: updateExerciseDto.orderIndex }
        : {}),
      ...(updateExerciseDto.prompt
        ? {
            prompt: updateExerciseDto.prompt,
            promptTranslations: this.buildTranslations(
              updateExerciseDto.prompt,
            ),
          }
        : {}),
      ...(typeof updateExerciseDto.instructions === 'string'
        ? {
            instructions: updateExerciseDto.instructions,
            instructionsTranslations: this.buildTranslations(
              updateExerciseDto.instructions,
            ),
          }
        : {}),
      ...(updateExerciseDto.content
        ? { content: updateExerciseDto.content as Prisma.InputJsonValue }
        : {}),
      ...(updateExerciseDto.correctAnswer
        ? {
            correctAnswer:
              updateExerciseDto.correctAnswer as Prisma.InputJsonValue,
          }
        : {}),
      updatedById: currentUser.sub,
    });

    await this.adminActivityService.log({
      adminId: currentUser.sub,
      action: AdminAction.UPDATE,
      entityType: ContentEntityType.EXERCISE,
      entityId: updatedExercise.id,
      beforeData: exercise,
      afterData: updatedExercise,
    });

    return updatedExercise;
  }

  async deleteExercise(currentUser: AuthUser, exerciseId: string) {
    const exercise = await this.exerciseRepository.findById(exerciseId);

    if (!exercise) {
      throw new NotFoundException('Exercise not found');
    }

    await this.exerciseRepository.delete(exerciseId);
    await this.adminActivityService.log({
      adminId: currentUser.sub,
      action: AdminAction.DELETE,
      entityType: ContentEntityType.EXERCISE,
      entityId: exercise.id,
      beforeData: exercise,
    });

    return {
      message: 'Exercise deleted successfully',
    };
  }

  private buildTranslations(value: string) {
    return {
      en: value,
    };
  }
}
