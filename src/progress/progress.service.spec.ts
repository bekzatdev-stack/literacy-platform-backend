import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LessonProgressStatus, NotificationType } from '@prisma/client';
import { ChildrenService } from '../children/children.service';
import { ExerciseRepository } from '../exercises/repositories/exercise.repository';
import { LessonRepository } from '../lessons/repositories/lesson.repository';
import { ProgressRepository } from './repositories/progress.repository';
import { ProgressService } from './progress.service';

describe('ProgressService', () => {
  let service: ProgressService;
  let childrenService: jest.Mocked<ChildrenService>;
  let exerciseRepository: jest.Mocked<ExerciseRepository>;
  let lessonRepository: jest.Mocked<LessonRepository>;
  let progressRepository: jest.Mocked<ProgressRepository>;

  beforeEach(() => {
    childrenService = {
      getAccessibleChildEntityOrThrow: jest.fn(),
      formatChildResponse: jest.fn(),
    } as unknown as jest.Mocked<ChildrenService>;

    exerciseRepository = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<ExerciseRepository>;

    lessonRepository = {
      findByIdWithExercises: jest.fn(),
      findPreviousPublishedLessonInUnit: jest.fn(),
    } as unknown as jest.Mocked<LessonRepository>;

    progressRepository = {
      countExerciseAttempts: jest.fn(),
      createExerciseSubmission: jest.fn(),
      countDistinctSubmittedExercises: jest.fn(),
      upsertLessonProgressInProgress: jest.fn(),
      findLessonProgress: jest.fn(),
      markLessonCompleted: jest.fn(),
      countCompletedLessonsForChild: jest.fn(),
      countPublishedLessons: jest.fn(),
      updateChildGamification: jest.fn(),
      ensureDefaultBadges: jest.fn(),
      findBadgeByCode: jest.fn(),
      findChildBadge: jest.fn(),
      awardBadge: jest.fn(),
      createNotification: jest.fn(),
      countPublishedLessonsInUnit: jest.fn(),
      countCompletedLessonsInUnitForChild: jest.fn(),
      getChildProgressHistory: jest.fn(),
      getPaginatedChildProgressHistory: jest.fn(),
      countChildExerciseSubmissions: jest.fn(),
      getPaginatedChildExerciseSubmissions: jest.fn(),
      getChildBadges: jest.fn(),
    } as unknown as jest.Mocked<ProgressRepository>;

    service = new ProgressService(
      childrenService,
      exerciseRepository,
      lessonRepository,
      progressRepository,
    );
  });

  it('marks answers as correct even when object keys are ordered differently', async () => {
    const child = {
      id: 'child-1',
      parentId: 'parent-1',
    };
    const exercise = {
      id: 'exercise-1',
      lessonId: 'lesson-1',
      lesson: {
        status: 'PUBLISHED',
        unit: {
          isPublished: true,
        },
      },
      correctAnswer: {
        first: 'a',
        second: 2,
      },
    };
    const lesson = {
      id: 'lesson-1',
      unitId: 'unit-1',
      orderIndex: 1,
      status: 'PUBLISHED',
      exercises: [{ id: 'exercise-1' }],
      unit: {
        isPublished: true,
      },
    };

    childrenService.getAccessibleChildEntityOrThrow.mockResolvedValue(
      child as never,
    );
    exerciseRepository.findById.mockResolvedValue(exercise as never);
    progressRepository.countExerciseAttempts.mockResolvedValue(0);
    progressRepository.createExerciseSubmission.mockResolvedValue({
      id: 'submission-1',
      isCorrect: true,
    } as never);
    lessonRepository.findByIdWithExercises.mockResolvedValue(lesson as never);
    lessonRepository.findPreviousPublishedLessonInUnit.mockResolvedValue(null);
    progressRepository.countDistinctSubmittedExercises.mockResolvedValue(1);
    progressRepository.upsertLessonProgressInProgress.mockResolvedValue({
      status: LessonProgressStatus.IN_PROGRESS,
      completedExercisesCount: 1,
      totalExercisesCount: 1,
    } as never);

    const result = await service.submitExercise(
      {
        sub: 'parent-1',
        role: 'PARENT',
        accountType: 'USER',
        tokenType: 'access',
      },
      'exercise-1',
      {
        childId: 'child-1',
        answer: {
          second: 2,
          first: 'a',
        },
        timeTakenSeconds: 8,
      },
    );

    expect(progressRepository.createExerciseSubmission).toHaveBeenCalledWith(
      expect.objectContaining({
        isCorrect: true,
        attemptNumber: 1,
      }),
    );
    expect(result.progress.isReadyForCompletion).toBe(true);
  });

  it('rejects lesson completion until all exercises are submitted', async () => {
    childrenService.getAccessibleChildEntityOrThrow.mockResolvedValue({
      id: 'child-1',
      parentId: 'parent-1',
    } as never);
    lessonRepository.findByIdWithExercises.mockResolvedValue({
      id: 'lesson-1',
      unitId: 'unit-1',
      orderIndex: 1,
      status: 'PUBLISHED',
      exercises: [{ id: 'exercise-1' }, { id: 'exercise-2' }],
      unit: {
        isPublished: true,
      },
    } as never);
    lessonRepository.findPreviousPublishedLessonInUnit.mockResolvedValue(null);
    progressRepository.countDistinctSubmittedExercises.mockResolvedValue(1);

    await expect(
      service.completeLesson(
        {
          sub: 'parent-1',
          role: 'PARENT',
          accountType: 'USER',
          tokenType: 'access',
        },
        'lesson-1',
        {
          childId: 'child-1',
        },
      ),
    ).rejects.toThrow(
      new BadRequestException(
        'All exercises must be submitted before completing the lesson',
      ),
    );
  });

  it('awards XP, updates streak and returns badges on lesson completion', async () => {
    const child = {
      id: 'child-1',
      parentId: 'parent-1',
      displayName: 'Ali',
      xpPoints: 40,
      streakCount: 2,
      lastActiveAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      currentCurriculumLevel: 1,
      gamificationLevel: 1,
      overallProgressPercent: 0,
      isActive: true,
      age: 6,
      avatarUrl: null,
      username: 'ali_reader',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const lesson = {
      id: 'lesson-1',
      title: 'Letter A Sounds',
      unitId: 'unit-1',
      orderIndex: 1,
      status: 'PUBLISHED',
      xpReward: 10,
      exercises: [{ id: 'exercise-1' }],
      unit: {
        curriculumLevel: 1,
        isPublished: true,
      },
    };
    const updatedChild = {
      ...child,
      xpPoints: 50,
      streakCount: 3,
      gamificationLevel: 2,
      lastActiveAt: new Date(),
      streakUpdatedAt: new Date(),
      overallProgressPercent: 100,
    };
    const firstLessonBadge = {
      id: 'badge-1',
      code: 'FIRST_LESSON',
      name: 'First Lesson',
    };
    const unitCompleteBadge = {
      id: 'badge-2',
      code: 'UNIT_COMPLETE',
      name: 'Unit Complete',
    };

    childrenService.getAccessibleChildEntityOrThrow.mockResolvedValue(
      child as never,
    );
    childrenService.formatChildResponse.mockReturnValue({
      id: updatedChild.id,
      xpPoints: updatedChild.xpPoints,
      streakCount: updatedChild.streakCount,
      gamificationLevel: updatedChild.gamificationLevel,
    } as never);
    lessonRepository.findByIdWithExercises.mockResolvedValue(lesson as never);
    lessonRepository.findPreviousPublishedLessonInUnit.mockResolvedValue(null);
    progressRepository.countDistinctSubmittedExercises.mockResolvedValue(1);
    progressRepository.findLessonProgress.mockResolvedValue(null);
    progressRepository.markLessonCompleted.mockResolvedValue({
      id: 'progress-1',
      childId: 'child-1',
      lessonId: 'lesson-1',
      status: LessonProgressStatus.COMPLETED,
      earnedXp: 10,
    } as never);
    progressRepository.countCompletedLessonsForChild.mockResolvedValue(0);
    progressRepository.countPublishedLessons.mockResolvedValue(1);
    progressRepository.updateChildGamification.mockResolvedValue(
      updatedChild as never,
    );
    progressRepository.ensureDefaultBadges.mockResolvedValue(undefined);
    progressRepository.countPublishedLessonsInUnit.mockResolvedValue(1);
    progressRepository.countCompletedLessonsInUnitForChild.mockResolvedValue(1);
    progressRepository.findBadgeByCode
      .mockResolvedValueOnce(firstLessonBadge as never)
      .mockResolvedValueOnce(unitCompleteBadge as never);
    progressRepository.findChildBadge.mockResolvedValue(null);
    progressRepository.awardBadge
      .mockResolvedValueOnce({
        awardedAt: new Date('2026-04-28T10:00:00.000Z'),
      } as never)
      .mockResolvedValueOnce({
        awardedAt: new Date('2026-04-28T10:01:00.000Z'),
      } as never);

    const result = await service.completeLesson(
      {
        sub: 'parent-1',
        role: 'PARENT',
        accountType: 'USER',
        tokenType: 'access',
      },
      'lesson-1',
      {
        childId: 'child-1',
      },
    );

    expect(progressRepository.updateChildGamification).toHaveBeenCalledWith(
      'child-1',
      expect.objectContaining({
        xpPoints: 50,
        gamificationLevel: 2,
        streakCount: 3,
        currentCurriculumLevel: 1,
      }),
    );
    expect(progressRepository.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NotificationType.LESSON_COMPLETED,
      }),
    );
    expect(result.message).toBe('Lesson completed successfully');
    expect(result.awardedXp).toBe(10);
    expect(result.awardedBadges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'FIRST_LESSON' }),
        expect.objectContaining({ code: 'UNIT_COMPLETE' }),
      ]),
    );
    expect(result.child).toEqual(
      expect.objectContaining({
        xpPoints: 50,
        streakCount: 3,
        gamificationLevel: 2,
      }),
    );
  });

  it('throws when an exercise does not exist', async () => {
    childrenService.getAccessibleChildEntityOrThrow.mockResolvedValue({
      id: 'child-1',
      parentId: 'parent-1',
    } as never);
    exerciseRepository.findById.mockResolvedValue(null);

    await expect(
      service.submitExercise(
        {
          sub: 'parent-1',
          role: 'PARENT',
          accountType: 'USER',
          tokenType: 'access',
        },
        'missing-exercise',
        {
          childId: 'child-1',
          answer: {
            correctOption: 'a',
          },
          timeTakenSeconds: 5,
        },
      ),
    ).rejects.toThrow(new NotFoundException('Exercise not found'));
  });
});
