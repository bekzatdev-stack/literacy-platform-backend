import { Injectable } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../../auth/interfaces/auth-user.interface';
import { ListChildrenQueryDto } from '../dto/list-children.query.dto';

@Injectable()
export class ChildRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ChildProfileCreateInput) {
    return this.prisma.childProfile.create({
      data,
      include: {
        parent: true,
      },
    });
  }

  async findById(childId: string) {
    return this.prisma.childProfile.findUnique({
      where: { id: childId },
      include: {
        parent: true,
        badgeAwards: {
          include: {
            badge: true,
          },
        },
      },
    });
  }

  async findByUsername(username: string) {
    return this.prisma.childProfile.findUnique({
      where: { username },
    });
  }

  async listForUser(currentUser: AuthUser, query: ListChildrenQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.page_size ?? 10;
    const skip = (page - 1) * pageSize;

    const where: Prisma.ChildProfileWhereInput = {
      ...(currentUser.role === UserRole.PARENT
        ? { parentId: currentUser.sub }
        : {}),
      ...(query.search
        ? {
            OR: [
              {
                displayName: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              {
                username: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : {}),
      ...(query.age ? { age: query.age } : {}),
      ...(typeof query.isActive === 'boolean'
        ? { isActive: query.isActive }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.childProfile.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.childProfile.count({ where }),
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

  async update(childId: string, data: Prisma.ChildProfileUpdateInput) {
    return this.prisma.childProfile.update({
      where: { id: childId },
      data,
      include: {
        parent: true,
      },
    });
  }

  async delete(childId: string) {
    return this.prisma.childProfile.delete({
      where: { id: childId },
    });
  }
}
