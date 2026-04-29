import { Injectable } from '@nestjs/common';
import { LessonStatus, Prisma, UserRole } from '@prisma/client';
import type { AuthUser } from '../../auth/interfaces/auth-user.interface';
import { PrismaService } from '../../prisma/prisma.service';

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
        lesson: true,
      },
    });
  }

  async listByLesson(currentUser: AuthUser, lessonId: string) {
    return this.prisma.exercise.findMany({
      where: {
        lessonId,
        ...(currentUser.role === UserRole.PARENT
          ? {
              lesson: {
                status: LessonStatus.PUBLISHED,
                unit: { isPublished: true },
              },
            }
          : {}),
      },
      orderBy: {
        orderIndex: 'asc',
      },
    });
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
