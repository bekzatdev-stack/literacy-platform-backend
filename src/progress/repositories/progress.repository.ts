import { Injectable } from '@nestjs/common';
import {
  AdminAction,
  ContentEntityType,
  LessonProgressStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProgressRepository {
  constructor(private readonly prisma: PrismaService) {}

  async countExerciseAttempts(childId: string, exerciseId: string) {
    return this.prisma.exerciseSubmission.count({
      where: {
        childId,
        exerciseId,
      },
    });
  }

  async createExerciseSubmission(data: Prisma.ExerciseSubmissionCreateInput) {
    return this.prisma.exerciseSubmission.create({
      data,
    });
  }

  async countDistinctSubmittedExercises(childId: string, lessonId: string) {
    const submissions = await this.prisma.exerciseSubmission.findMany({
      where: {
        childId,
        lessonId,
      },
      distinct: ['exerciseId'],
      select: {
        exerciseId: true,
      },
    });

    return submissions.length;
  }

  async findLessonProgress(childId: string, lessonId: string) {
    return this.prisma.lessonProgress.findUnique({
      where: {
        childId_lessonId: {
          childId,
          lessonId,
        },
      },
    });
  }

  async upsertLessonProgressInProgress(input: {
    childId: string;
    lessonId: string;
    completedExercisesCount: number;
    totalExercisesCount: number;
    lastSubmittedAt: Date;
  }) {
    return this.prisma.lessonProgress.upsert({
      where: {
        childId_lessonId: {
          childId: input.childId,
          lessonId: input.lessonId,
        },
      },
      create: {
        childId: input.childId,
        lessonId: input.lessonId,
        status: LessonProgressStatus.IN_PROGRESS,
        completedExercisesCount: input.completedExercisesCount,
        totalExercisesCount: input.totalExercisesCount,
        startedAt: input.lastSubmittedAt,
        lastSubmittedAt: input.lastSubmittedAt,
      },
      update: {
        completedExercisesCount: input.completedExercisesCount,
        totalExercisesCount: input.totalExercisesCount,
        lastSubmittedAt: input.lastSubmittedAt,
      },
    });
  }

  async markLessonCompleted(input: {
    childId: string;
    lessonId: string;
    completedExercisesCount: number;
    totalExercisesCount: number;
    earnedXp: number;
    completedAt: Date;
  }) {
    return this.prisma.lessonProgress.upsert({
      where: {
        childId_lessonId: {
          childId: input.childId,
          lessonId: input.lessonId,
        },
      },
      create: {
        childId: input.childId,
        lessonId: input.lessonId,
        status: LessonProgressStatus.COMPLETED,
        completedExercisesCount: input.completedExercisesCount,
        totalExercisesCount: input.totalExercisesCount,
        startedAt: input.completedAt,
        lastSubmittedAt: input.completedAt,
        completedAt: input.completedAt,
        earnedXp: input.earnedXp,
      },
      update: {
        status: LessonProgressStatus.COMPLETED,
        completedExercisesCount: input.completedExercisesCount,
        totalExercisesCount: input.totalExercisesCount,
        lastSubmittedAt: input.completedAt,
        completedAt: input.completedAt,
        earnedXp: input.earnedXp,
      },
    });
  }

  async updateChildGamification(
    childId: string,
    data: Prisma.ChildProfileUpdateInput,
  ) {
    return this.prisma.childProfile.update({
      where: { id: childId },
      data,
    });
  }

  async countCompletedLessonsForChild(childId: string) {
    return this.prisma.lessonProgress.count({
      where: {
        childId,
        status: LessonProgressStatus.COMPLETED,
      },
    });
  }

  async countPublishedLessons() {
    return this.prisma.lesson.count({
      where: {
        status: 'PUBLISHED',
        unit: {
          isPublished: true,
        },
      },
    });
  }

  async countPublishedLessonsInUnit(unitId: string) {
    return this.prisma.lesson.count({
      where: {
        unitId,
        status: 'PUBLISHED',
      },
    });
  }

  async countCompletedLessonsInUnitForChild(childId: string, unitId: string) {
    return this.prisma.lessonProgress.count({
      where: {
        childId,
        status: LessonProgressStatus.COMPLETED,
        lesson: {
          unitId,
        },
      },
    });
  }

  async getChildProgressHistory(childId: string) {
    return this.prisma.lessonProgress.findMany({
      where: {
        childId,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      include: {
        lesson: {
          include: {
            unit: true,
          },
        },
      },
    });
  }

  async getChildExerciseSubmissions(childId: string) {
    return this.prisma.exerciseSubmission.findMany({
      where: {
        childId,
      },
      orderBy: {
        submittedAt: 'desc',
      },
      include: {
        lesson: true,
        exercise: true,
      },
    });
  }

  async ensureDefaultBadges() {
    const defaultBadges: Array<
      Prisma.BadgeUpsertArgs['create'] & { code: string }
    > = [
      {
        code: 'FIRST_LESSON',
        name: 'First Lesson',
        nameTranslations: { en: 'First Lesson' },
        description: 'Complete the first lesson.',
        descriptionTranslations: { en: 'Complete the first lesson.' },
        lessonCompletionThreshold: 1,
      },
      {
        code: 'XP_100',
        name: '100 XP',
        nameTranslations: { en: '100 XP' },
        description: 'Earn 100 total XP.',
        descriptionTranslations: { en: 'Earn 100 total XP.' },
        xpThreshold: 100,
      },
      {
        code: 'STREAK_7',
        name: '7 Day Streak',
        nameTranslations: { en: '7 Day Streak' },
        description: 'Practice for 7 consecutive days.',
        descriptionTranslations: { en: 'Practice for 7 consecutive days.' },
        streakThreshold: 7,
      },
      {
        code: 'UNIT_COMPLETE',
        name: 'Unit Complete',
        nameTranslations: { en: 'Unit Complete' },
        description: 'Finish all lessons in a unit.',
        descriptionTranslations: { en: 'Finish all lessons in a unit.' },
        unitCompletionThreshold: 1,
      },
    ];

    await Promise.all(
      defaultBadges.map((badge) =>
        this.prisma.badge.upsert({
          where: { code: badge.code },
          create: badge,
          update: {
            name: badge.name,
            nameTranslations: badge.nameTranslations,
            description: badge.description,
            descriptionTranslations: badge.descriptionTranslations,
            xpThreshold: badge.xpThreshold,
            streakThreshold: badge.streakThreshold,
            lessonCompletionThreshold: badge.lessonCompletionThreshold,
            unitCompletionThreshold: badge.unitCompletionThreshold,
          },
        }),
      ),
    );
  }

  async findBadgeByCode(code: string) {
    return this.prisma.badge.findUnique({
      where: { code },
    });
  }

  async findChildBadge(childId: string, badgeId: string) {
    return this.prisma.childBadge.findFirst({
      where: {
        childId,
        badgeId,
      },
    });
  }

  async awardBadge(childId: string, badgeId: string) {
    return this.prisma.childBadge.create({
      data: {
        childId,
        badgeId,
      },
      include: {
        badge: true,
      },
    });
  }

  async getChildBadges(childId: string) {
    return this.prisma.childBadge.findMany({
      where: {
        childId,
      },
      orderBy: {
        awardedAt: 'desc',
      },
      include: {
        badge: true,
      },
    });
  }

  async createNotification(data: Prisma.NotificationCreateInput) {
    return this.prisma.notification.create({
      data,
    });
  }

  async createAdminLog(adminId: string, entityId: string, afterData: object) {
    return this.prisma.adminActivityLog.create({
      data: {
        adminId,
        action: AdminAction.UPDATE,
        entityType: ContentEntityType.BADGE,
        entityId,
        afterData: afterData,
      },
    });
  }
}
