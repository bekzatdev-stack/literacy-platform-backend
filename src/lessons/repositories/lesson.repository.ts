import { Injectable } from '@nestjs/common';
import { LessonStatus, Prisma, UserRole } from '@prisma/client';
import type { AuthUser } from '../../auth/interfaces/auth-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { ListLessonsQueryDto } from '../dto/list-lessons.query.dto';

@Injectable()
export class LessonRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.LessonCreateInput) {
    return this.prisma.lesson.create({ data });
  }

  async findById(id: string) {
    return this.prisma.lesson.findUnique({
      where: { id },
      include: {
        unit: true,
      },
    });
  }

  async findByIdWithExercises(id: string) {
    return this.prisma.lesson.findUnique({
      where: { id },
      include: {
        unit: true,
        exercises: {
          orderBy: {
            orderIndex: 'asc',
          },
        },
      },
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.lesson.findUnique({
      where: { slug },
    });
  }

  async list(currentUser: AuthUser, query: ListLessonsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.page_size ?? 10;
    const skip = (page - 1) * pageSize;

    const where: Prisma.LessonWhereInput = {
      ...(currentUser.role === UserRole.PARENT
        ? { status: LessonStatus.PUBLISHED, unit: { isPublished: true } }
        : {}),
      ...(query.unitId ? { unitId: query.unitId } : {}),
      ...(query.lessonType ? { lessonType: query.lessonType } : {}),
      ...(query.difficulty ? { difficulty: query.difficulty } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.curriculumLevel
        ? { unit: { curriculumLevel: query.curriculumLevel } }
        : {}),
    };

    const orderByField = query.sort_by ?? 'orderIndex';
    const orderByDirection = query.sort_order ?? 'asc';

    const [items, total] = await this.prisma.$transaction([
      this.prisma.lesson.findMany({
        where,
        skip,
        take: pageSize,
        orderBy:
          orderByField === 'title'
            ? { title: orderByDirection }
            : orderByField === 'createdAt'
              ? { createdAt: orderByDirection }
              : { orderIndex: orderByDirection },
        include: {
          unit: true,
          exercises: {
            select: {
              id: true,
            },
          },
        },
      }),
      this.prisma.lesson.count({ where }),
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

  async update(id: string, data: Prisma.LessonUpdateInput) {
    return this.prisma.lesson.update({
      where: { id },
      data,
      include: {
        unit: true,
      },
    });
  }

  async delete(id: string) {
    return this.prisma.lesson.delete({
      where: { id },
    });
  }
}
