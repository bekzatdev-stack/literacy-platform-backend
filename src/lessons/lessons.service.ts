import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AdminAction,
  ContentEntityType,
  LessonStatus,
  UserRole,
} from '@prisma/client';
import { AdminActivityService } from '../admin-activity/admin-activity.service';
import type { AuthUser } from '../auth/interfaces/auth-user.interface';
import { UnitsService } from '../units/units.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { ListLessonsQueryDto } from './dto/list-lessons.query.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { LessonRepository } from './repositories/lesson.repository';

@Injectable()
export class LessonsService {
  constructor(
    private readonly lessonRepository: LessonRepository,
    private readonly unitsService: UnitsService,
    private readonly adminActivityService: AdminActivityService,
  ) {}

  async createLesson(
    currentUser: AuthUser,
    unitId: string,
    createLessonDto: CreateLessonDto,
  ) {
    await this.unitsService.getUnitById(unitId);

    const existingLesson = await this.lessonRepository.findBySlug(
      createLessonDto.slug,
    );

    if (existingLesson) {
      throw new ConflictException('Lesson slug already exists');
    }

    const createdLesson = await this.lessonRepository.create({
      slug: createLessonDto.slug,
      title: createLessonDto.title,
      titleTranslations: this.buildTranslations(createLessonDto.title),
      instructions: createLessonDto.instructions,
      instructionsTranslations: createLessonDto.instructions
        ? this.buildTranslations(createLessonDto.instructions)
        : undefined,
      lessonType: createLessonDto.lessonType,
      difficulty: createLessonDto.difficulty,
      orderIndex: createLessonDto.orderIndex,
      xpReward: createLessonDto.xpReward ?? 10,
      status: createLessonDto.status ?? LessonStatus.DRAFT,
      publishedAt:
        createLessonDto.status === LessonStatus.PUBLISHED
          ? new Date()
          : undefined,
      createdById: currentUser.sub,
      updatedById: currentUser.sub,
      unit: {
        connect: {
          id: unitId,
        },
      },
    });

    await this.adminActivityService.log({
      adminId: currentUser.sub,
      action: AdminAction.CREATE,
      entityType: ContentEntityType.LESSON,
      entityId: createdLesson.id,
      afterData: createdLesson,
    });

    return createdLesson;
  }

  async listLessons(currentUser: AuthUser, query: ListLessonsQueryDto) {
    const result = await this.lessonRepository.list(currentUser, query);

    return {
      items: result.items.map((lesson) => ({
        ...lesson,
        exerciseCount: lesson.exercises.length,
      })),
      meta: result.meta,
    };
  }

  async getLessonById(lessonId: string) {
    const lesson = await this.lessonRepository.findById(lessonId);

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    return lesson;
  }

  async getAccessibleLessonById(currentUser: AuthUser, lessonId: string) {
    const lesson = await this.getLessonById(lessonId);

    if (
      currentUser.role === UserRole.PARENT &&
      (lesson.status !== LessonStatus.PUBLISHED || !lesson.unit.isPublished)
    ) {
      throw new NotFoundException('Lesson not found');
    }

    return lesson;
  }

  async updateLesson(
    currentUser: AuthUser,
    lessonId: string,
    updateLessonDto: UpdateLessonDto,
  ) {
    const lesson = await this.lessonRepository.findById(lessonId);

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    if (updateLessonDto.slug && updateLessonDto.slug !== lesson.slug) {
      const existingLesson = await this.lessonRepository.findBySlug(
        updateLessonDto.slug,
      );

      if (existingLesson) {
        throw new ConflictException('Lesson slug already exists');
      }
    }

    const updatedLesson = await this.lessonRepository.update(lessonId, {
      ...(updateLessonDto.slug ? { slug: updateLessonDto.slug } : {}),
      ...(updateLessonDto.title
        ? {
            title: updateLessonDto.title,
            titleTranslations: this.buildTranslations(updateLessonDto.title),
          }
        : {}),
      ...(typeof updateLessonDto.instructions === 'string'
        ? {
            instructions: updateLessonDto.instructions,
            instructionsTranslations: this.buildTranslations(
              updateLessonDto.instructions,
            ),
          }
        : {}),
      ...(updateLessonDto.lessonType
        ? { lessonType: updateLessonDto.lessonType }
        : {}),
      ...(updateLessonDto.difficulty
        ? { difficulty: updateLessonDto.difficulty }
        : {}),
      ...(typeof updateLessonDto.orderIndex === 'number'
        ? { orderIndex: updateLessonDto.orderIndex }
        : {}),
      ...(typeof updateLessonDto.xpReward === 'number'
        ? { xpReward: updateLessonDto.xpReward }
        : {}),
      ...(updateLessonDto.status
        ? {
            status: updateLessonDto.status,
            publishedAt:
              updateLessonDto.status === LessonStatus.PUBLISHED
                ? new Date()
                : updateLessonDto.status === LessonStatus.DRAFT
                  ? null
                  : lesson.publishedAt,
          }
        : {}),
      updatedById: currentUser.sub,
    });

    await this.adminActivityService.log({
      adminId: currentUser.sub,
      action:
        updateLessonDto.status === LessonStatus.PUBLISHED
          ? AdminAction.PUBLISH
          : updateLessonDto.status === LessonStatus.DRAFT
            ? AdminAction.UNPUBLISH
            : AdminAction.UPDATE,
      entityType: ContentEntityType.LESSON,
      entityId: updatedLesson.id,
      beforeData: lesson,
      afterData: updatedLesson,
    });

    return updatedLesson;
  }

  async deleteLesson(currentUser: AuthUser, lessonId: string) {
    const lesson = await this.lessonRepository.findById(lessonId);

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    await this.lessonRepository.delete(lessonId);
    await this.adminActivityService.log({
      adminId: currentUser.sub,
      action: AdminAction.DELETE,
      entityType: ContentEntityType.LESSON,
      entityId: lesson.id,
      beforeData: lesson,
    });

    return {
      message: 'Lesson deleted successfully',
    };
  }

  private buildTranslations(value: string) {
    return {
      en: value,
    };
  }
}
