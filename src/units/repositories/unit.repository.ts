import { Injectable } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import type { AuthUser } from '../../auth/interfaces/auth-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { ListUnitsQueryDto } from '../dto/list-units.query.dto';

@Injectable()
export class UnitRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.UnitCreateInput) {
    return this.prisma.unit.create({ data });
  }

  async findById(id: string) {
    return this.prisma.unit.findUnique({
      where: { id },
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.unit.findUnique({
      where: { slug },
    });
  }

  async list(currentUser: AuthUser, query: ListUnitsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.page_size ?? 10;
    const skip = (page - 1) * pageSize;

    const where: Prisma.UnitWhereInput = {
      ...(currentUser.role === UserRole.PARENT ? { isPublished: true } : {}),
      ...(typeof query.isPublished === 'boolean'
        ? { isPublished: query.isPublished }
        : {}),
      ...(query.curriculumLevel
        ? { curriculumLevel: query.curriculumLevel }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.unit.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ curriculumLevel: 'asc' }, { orderIndex: 'asc' }],
      }),
      this.prisma.unit.count({ where }),
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

  async update(id: string, data: Prisma.UnitUpdateInput) {
    return this.prisma.unit.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return this.prisma.unit.delete({
      where: { id },
    });
  }
}
