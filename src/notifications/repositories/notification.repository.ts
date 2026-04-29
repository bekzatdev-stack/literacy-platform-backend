import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ListNotificationsQueryDto } from '../dto/list-notifications.query.dto';

@Injectable()
export class NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listForParent(parentId: string, query: ListNotificationsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.page_size ?? 10;
    const skip = (page - 1) * pageSize;

    const where: Prisma.NotificationWhereInput = {
      parentId,
      ...(typeof query.isRead === 'boolean' ? { isRead: query.isRead } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.notification.count({ where }),
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

  async findById(id: string) {
    return this.prisma.notification.findUnique({
      where: { id },
    });
  }

  async update(id: string, data: Prisma.NotificationUpdateInput) {
    return this.prisma.notification.update({
      where: { id },
      data,
    });
  }
}
