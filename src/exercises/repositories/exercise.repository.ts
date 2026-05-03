import { Injectable } from '@nestjs/common';
import { LessonStatus, Prisma, UserRole } from '@prisma/client';
import type { AuthUser } from '../../auth/interfaces/auth-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { ListExercisesQueryDto } from '../dto/list-exercises.query.dto';

@Injectable()
export class ExerciseRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ExerciseCreateInput) {
    return this.prisma.exercise.create({ data });
  }

  async findById(id: string) {
    return this.prisma.exercise.findUnique({
      where: { id },
      include: {
        lesson: {
          include: {
            unit: true,
          },
        },
      },
    });
  }

  async listByLesson(
    currentUser: AuthUser,
    lessonId: string,
    query: ListExercisesQueryDto,
  ) {
    const page = query.page ?? 1;
    const pageSize = query.page_size ?? 10;
    const skip = (page - 1) * pageSize;

    const where: Prisma.ExerciseWhereInput = {
      lessonId,
      ...(currentUser.role === UserRole.PARENT
        ? {
            lesson: {
              status: LessonStatus.PUBLISHED,
              unit: { isPublished: true },
            },
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.exercise.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {
          orderIndex: 'asc',
        },
      }),
      this.prisma.exercise.count({ where }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        page_size: pageSize,
        total_pages: Math.ceil(total / pageSize) || 1,
      },
    };
  }

  async update(id: string, data: Prisma.ExerciseUpdateInput) {
    return this.prisma.exercise.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return this.prisma.exercise.delete({
      where: { id },
    });
  }
}
