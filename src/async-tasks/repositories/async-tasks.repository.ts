import { Injectable } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AsyncTasksRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findChildrenAtRisk(todayStart: Date) {
    return this.prisma.childProfile.findMany({
      where: {
        isActive: true,
        OR: [{ lastActiveAt: null }, { lastActiveAt: { lt: todayStart } }],
      },
      include: {
        parent: true,
      },
    });
  }

  async resetBrokenStreaks(beforeDate: Date) {
    return this.prisma.childProfile.updateMany({
      where: {
        isActive: true,
        streakCount: { gt: 0 },
        OR: [{ lastActiveAt: null }, { lastActiveAt: { lt: beforeDate } }],
      },
      data: {
        streakCount: 0,
      },
    });
  }

  async createNotification(data: Prisma.NotificationCreateInput) {
    return this.prisma.notification.create({
      data,
    });
  }

  async findParentsWithWeeklyProgress(weekStart: Date) {
    return this.prisma.user.findMany({
      where: {
        role: UserRole.PARENT,
      },
      include: {
        children: {
          include: {
            lessonProgressRecords: {
              where: {
                completedAt: {
                  gte: weekStart,
                },
              },
              include: {
                lesson: true,
              },
            },
          },
        },
      },
    });
  }

  async countUnreadNotifications(parentId: string) {
    return this.prisma.notification.count({
      where: {
        parentId,
        isRead: false,
      },
    });
  }
}
