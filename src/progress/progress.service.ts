import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LessonProgressStatus,
  LessonStatus,
  NotificationType,
  Prisma,
  UserRole,
} from '@prisma/client';
import type { AuthUser } from '../auth/interfaces/auth-user.interface';
import { ChildrenService } from '../children/children.service';
import { ExerciseRepository } from '../exercises/repositories/exercise.repository';
import { LessonRepository } from '../lessons/repositories/lesson.repository';
import { CompleteLessonDto } from './dto/complete-lesson.dto';
import { ListChildProgressQueryDto } from './dto/list-child-progress.query.dto';
import { SubmitExerciseDto } from './dto/submit-exercise.dto';
import { ProgressRepository } from './repositories/progress.repository';

@Injectable()
export class ProgressService {
  constructor(
    private readonly childrenService: ChildrenService,
    private readonly exerciseRepository: ExerciseRepository,
    private readonly lessonRepository: LessonRepository,
    private readonly progressRepository: ProgressRepository,
  ) {}

  async submitExercise(
    currentUser: AuthUser,
    exerciseId: string,
    submitExerciseDto: SubmitExerciseDto,
  ) {
    const child = await this.childrenService.getAccessibleChildEntityOrThrow(
      currentUser,
      submitExerciseDto.childId,
    );
    const exercise = await this.exerciseRepository.findById(exerciseId);

    if (
      !exercise ||
      !this.isExerciseAccessibleToCurrentUser(currentUser, exercise)
    ) {
      throw new NotFoundException('Exercise not found');
    }

    const now = new Date();

    const lesson = await this.lessonRepository.findByIdWithExercises(
      exercise.lessonId,
    );

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    this.ensureLessonAccessibleToCurrentUser(currentUser, lesson);

    await this.ensureLessonCanBeStartedSequentially(child.id, {
      id: lesson.id,
      unitId: lesson.unitId,
      orderIndex: lesson.orderIndex,
    });

    const attemptNumber =
      (await this.progressRepository.countExerciseAttempts(
        child.id,
        exerciseId,
      )) + 1;
    const isCorrect = this.isAnswerCorrect(
      submitExerciseDto.answer,
      exercise.correctAnswer,
    );

    const submission = await this.progressRepository.createExerciseSubmission({
      answer: submitExerciseDto.answer as Prisma.InputJsonValue,
      isCorrect,
      timeTakenSeconds: submitExerciseDto.timeTakenSeconds,
      attemptNumber,
      submittedAt: now,
      child: {
        connect: {
          id: child.id,
        },
      },
      lesson: {
        connect: {
          id: exercise.lessonId,
        },
      },
      exercise: {
        connect: {
          id: exercise.id,
        },
      },
    });

    const completedExercisesCount =
      await this.progressRepository.countDistinctSubmittedExercises(
        child.id,
        lesson.id,
      );

    const progress =
      await this.progressRepository.upsertLessonProgressInProgress({
        childId: child.id,
        lessonId: lesson.id,
        completedExercisesCount,
        totalExercisesCount: lesson.exercises.length,
        lastSubmittedAt: now,
      });

    return {
      submission,
      progress: {
        lessonId: lesson.id,
        childId: child.id,
        status: progress.status,
        completedExercisesCount: progress.completedExercisesCount,
        totalExercisesCount: progress.totalExercisesCount,
        isReadyForCompletion:
          progress.completedExercisesCount >= progress.totalExercisesCount &&
          progress.totalExercisesCount > 0,
      },
    };
  }

  async completeLesson(
    currentUser: AuthUser,
    lessonId: string,
    completeLessonDto: CompleteLessonDto,
  ) {
    const child = await this.childrenService.getAccessibleChildEntityOrThrow(
      currentUser,
      completeLessonDto.childId,
    );
    const lesson = await this.lessonRepository.findByIdWithExercises(lessonId);

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    this.ensureLessonAccessibleToCurrentUser(currentUser, lesson);

    await this.ensureLessonCanBeStartedSequentially(child.id, {
      id: lesson.id,
      unitId: lesson.unitId,
      orderIndex: lesson.orderIndex,
    });

    if (lesson.exercises.length === 0) {
      throw new BadRequestException(
        'Lesson cannot be completed because it has no exercises',
      );
    }

    const completedExercisesCount =
      await this.progressRepository.countDistinctSubmittedExercises(
        child.id,
        lesson.id,
      );

    if (completedExercisesCount < lesson.exercises.length) {
      throw new BadRequestException(
        'All exercises must be submitted before completing the lesson',
      );
    }

    const existingProgress = await this.progressRepository.findLessonProgress(
      child.id,
      lesson.id,
    );
    const alreadyCompleted =
      existingProgress?.status === LessonProgressStatus.COMPLETED;
    const earnedXp = alreadyCompleted ? 0 : lesson.xpReward;
    const now = new Date();

    const progress = await this.progressRepository.markLessonCompleted({
      childId: child.id,
      lessonId: lesson.id,
      completedExercisesCount,
      totalExercisesCount: lesson.exercises.length,
      earnedXp: alreadyCompleted
        ? (existingProgress?.earnedXp ?? lesson.xpReward)
        : lesson.xpReward,
      completedAt: now,
    });

    let childForResponse: Parameters<
      ChildrenService['formatChildResponse']
    >[0] = child;
    let awardedBadges: Array<{ code: string; name: string; awardedAt: Date }> =
      [];

    if (!alreadyCompleted) {
      const newStreak = this.calculateUpdatedStreak(
        child.lastActiveAt ?? null,
        child.streakCount,
        now,
      );
      const totalCompletedLessons =
        (await this.progressRepository.countCompletedLessonsForChild(
          child.id,
        )) + 1;
      const totalPublishedLessons =
        await this.progressRepository.countPublishedLessons();
      const overallProgressPercent =
        totalPublishedLessons === 0
          ? 0
          : Number(
              ((totalCompletedLessons / totalPublishedLessons) * 100).toFixed(
                2,
              ),
            );
      const newXp = child.xpPoints + earnedXp;
      const newGamificationLevel = this.calculateGamificationLevel(newXp);

      const updatedChild =
        await this.progressRepository.updateChildGamification(child.id, {
          xpPoints: newXp,
          gamificationLevel: newGamificationLevel,
          streakCount: newStreak,
          lastActiveAt: now,
          streakUpdatedAt: now,
          overallProgressPercent,
          currentCurriculumLevel: lesson.unit.curriculumLevel,
        });
      childForResponse = updatedChild;

      awardedBadges = await this.evaluateAndAwardBadges(updatedChild.id, {
        xpPoints: newXp,
        streakCount: newStreak,
        totalCompletedLessons,
        unitId: lesson.unitId,
        parentId: child.parentId,
      });

      await this.progressRepository.createNotification({
        type: NotificationType.LESSON_COMPLETED,
        title: 'Lesson completed',
        message: `${child.displayName} completed ${lesson.title} and earned ${earnedXp} XP.`,
        payload: {
          childId: child.id,
          lessonId: lesson.id,
          earnedXp,
        },
        parent: {
          connect: {
            id: child.parentId,
          },
        },
        child: {
          connect: {
            id: child.id,
          },
        },
      });
    }

    return {
      message: alreadyCompleted
        ? 'Lesson was already completed earlier'
        : 'Lesson completed successfully',
      progress,
      child: this.childrenService.formatChildResponse(childForResponse),
      awardedXp: earnedXp,
      awardedBadges,
    };
  }

  async getChildProgressHistory(
    currentUser: AuthUser,
    childId: string,
    query: ListChildProgressQueryDto,
  ) {
    const child = await this.childrenService.getAccessibleChildEntityOrThrow(
      currentUser,
      childId,
    );
    const page = query.page ?? 1;
    const pageSize = query.page_size ?? 10;
    const skip = (page - 1) * pageSize;

    const [
      lessonProgressTotal,
      lessonProgressItems,
      submissionsTotal,
      submissionItems,
    ] = await Promise.all([
      this.progressRepository.getChildProgressHistory(child.id),
      this.progressRepository.getPaginatedChildProgressHistory(
        child.id,
        skip,
        pageSize,
      ),
      this.progressRepository.countChildExerciseSubmissions(child.id),
      this.progressRepository.getPaginatedChildExerciseSubmissions(
        child.id,
        skip,
        pageSize,
      ),
    ]);

    return {
      child: this.childrenService.formatChildResponse(child),
      lessonProgress: {
        items: lessonProgressItems,
        meta: {
          total: lessonProgressTotal,
          page,
          page_size: pageSize,
          total_pages: Math.ceil(lessonProgressTotal / pageSize) || 1,
        },
      },
      submissions: {
        items: submissionItems,
        meta: {
          total: submissionsTotal,
          page,
          page_size: pageSize,
          total_pages: Math.ceil(submissionsTotal / pageSize) || 1,
        },
      },
    };
  }

  async getChildBadges(currentUser: AuthUser, childId: string) {
    await this.childrenService.getAccessibleChildEntityOrThrow(
      currentUser,
      childId,
    );
    return this.progressRepository.getChildBadges(childId);
  }

  private calculateUpdatedStreak(
    lastActiveAt: Date | null,
    currentStreak: number,
    now: Date,
  ) {
    if (!lastActiveAt) {
      return 1;
    }

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastActiveDay = new Date(
      lastActiveAt.getFullYear(),
      lastActiveAt.getMonth(),
      lastActiveAt.getDate(),
    );
    const differenceInDays = Math.floor(
      (today.getTime() - lastActiveDay.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (differenceInDays <= 0) {
      return currentStreak;
    }

    if (differenceInDays === 1) {
      return currentStreak + 1;
    }

    return 1;
  }

  private calculateGamificationLevel(xpPoints: number) {
    return Math.floor(xpPoints / 50) + 1;
  }

  private ensureLessonAccessibleToCurrentUser(
    currentUser: AuthUser,
    lesson: {
      status: LessonStatus;
      unit: {
        isPublished: boolean;
      };
    },
  ) {
    if (
      currentUser.role === UserRole.PARENT &&
      (lesson.status !== LessonStatus.PUBLISHED || !lesson.unit.isPublished)
    ) {
      throw new NotFoundException('Lesson not found');
    }
  }

  private async ensureLessonCanBeStartedSequentially(
    childId: string,
    lesson: {
      id: string;
      unitId: string;
      orderIndex: number;
    },
  ) {
    const previousLesson =
      await this.lessonRepository.findPreviousPublishedLessonInUnit(
        lesson.unitId,
        lesson.orderIndex,
      );

    if (!previousLesson) {
      return;
    }

    const previousLessonProgress =
      await this.progressRepository.findLessonProgress(
        childId,
        previousLesson.id,
      );

    if (previousLessonProgress?.status === LessonProgressStatus.COMPLETED) {
      return;
    }

    throw new BadRequestException(
      'Previous lesson must be completed before starting this lesson',
    );
  }

  private isExerciseAccessibleToCurrentUser(
    currentUser: AuthUser,
    exercise: {
      lesson: {
        status: LessonStatus;
        unit: {
          isPublished: boolean;
        };
      };
    },
  ) {
    if (currentUser.role !== UserRole.PARENT) {
      return true;
    }

    return (
      exercise.lesson.status === LessonStatus.PUBLISHED &&
      exercise.lesson.unit.isPublished
    );
  }

  private isAnswerCorrect(
    answer: Record<string, unknown>,
    correctAnswer: Prisma.JsonValue | null,
  ) {
    if (!correctAnswer) {
      return true;
    }

    return this.stableStringify(answer) === this.stableStringify(correctAnswer);
  }

  private stableStringify(value: unknown): string {
    if (Array.isArray(value)) {
      return `[${value.map((item) => this.stableStringify(item)).join(',')}]`;
    }

    if (value && typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>).sort(
        ([a], [b]) => a.localeCompare(b),
      );
      return `{${entries
        .map(([key, val]) => `${key}:${this.stableStringify(val)}`)
        .join(',')}}`;
    }

    return JSON.stringify(value);
  }

  private async evaluateAndAwardBadges(
    childId: string,
    stats: {
      xpPoints: number;
      streakCount: number;
      totalCompletedLessons: number;
      unitId: string;
      parentId: string;
    },
  ) {
    await this.progressRepository.ensureDefaultBadges();

    const badgeChecks = [
      {
        code: 'FIRST_LESSON',
        condition: stats.totalCompletedLessons >= 1,
      },
      {
        code: 'XP_100',
        condition: stats.xpPoints >= 100,
      },
      {
        code: 'STREAK_7',
        condition: stats.streakCount >= 7,
      },
      {
        code: 'UNIT_COMPLETE',
        condition: await this.isUnitComplete(childId, stats.unitId),
      },
    ];

    const awardedBadges: Array<{
      code: string;
      name: string;
      awardedAt: Date;
    }> = [];

    for (const badgeCheck of badgeChecks) {
      if (!badgeCheck.condition) {
        continue;
      }

      const badge = await this.progressRepository.findBadgeByCode(
        badgeCheck.code,
      );

      if (!badge) {
        continue;
      }

      const existingChildBadge = await this.progressRepository.findChildBadge(
        childId,
        badge.id,
      );

      if (existingChildBadge) {
        continue;
      }

      const childBadge = await this.progressRepository.awardBadge(
        childId,
        badge.id,
      );

      awardedBadges.push({
        code: badge.code,
        name: badge.name,
        awardedAt: childBadge.awardedAt,
      });

      await this.progressRepository.createNotification({
        type: NotificationType.BADGE_AWARDED,
        title: 'Badge earned',
        message: `A new badge was unlocked: ${badge.name}.`,
        payload: {
          childId,
          badgeCode: badge.code,
        },
        parent: {
          connect: {
            id: stats.parentId,
          },
        },
        child: {
          connect: {
            id: childId,
          },
        },
      });
    }

    return awardedBadges;
  }

  private async isUnitComplete(childId: string, unitId: string) {
    const totalPublishedLessons =
      await this.progressRepository.countPublishedLessonsInUnit(unitId);
    const completedLessons =
      await this.progressRepository.countCompletedLessonsInUnitForChild(
        childId,
        unitId,
      );

    return (
      totalPublishedLessons > 0 && completedLessons >= totalPublishedLessons
    );
  }
}
