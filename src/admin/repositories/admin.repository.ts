import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { LeaderboardQueryDto } from '../dto/leaderboard.query.dto';
import { ListAdminLogsQueryDto } from '../dto/list-admin-logs.query.dto';

@Injectable()
export class AdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listLogs(query: ListAdminLogsQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.page_size ?? 10;
    const skip = (page - 1) * pageSize;

    const where: Prisma.AdminActivityLogWhereInput = {
      ...(query.action ? { action: query.action } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.adminActivityLog.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          admin: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.adminActivityLog.count({ where }),
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

  async getStats() {
    const [
      totalParents,
      totalAdmins,
      totalChildren,
      activeChildren,
      totalUnits,
      publishedUnits,
      totalLessons,
      publishedLessons,
      totalExercises,
      completedLessonRecords,
      totalNotifications,
      unreadNotifications,
    ] = await this.prisma.$transaction([
      this.prisma.user.count({ where: { role: 'PARENT' } }),
      this.prisma.user.count({ where: { role: 'ADMIN' } }),
      this.prisma.childProfile.count(),
      this.prisma.childProfile.count({ where: { isActive: true } }),
      this.prisma.unit.count(),
      this.prisma.unit.count({ where: { isPublished: true } }),
      this.prisma.lesson.count(),
      this.prisma.lesson.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.exercise.count(),
      this.prisma.lessonProgress.count({ where: { status: 'COMPLETED' } }),
      this.prisma.notification.count(),
      this.prisma.notification.count({ where: { isRead: false } }),
    ]);

    const potentialCompletions =
      publishedLessons === 0
        ? 0
        : publishedLessons * Math.max(totalChildren, 1);
    const completionRate =
      potentialCompletions === 0
        ? 0
        : Number(
            ((completedLessonRecords / potentialCompletions) * 100).toFixed(2),
          );

    return {
      users: {
        totalParents,
        totalAdmins,
        totalChildren,
        activeChildren,
      },
      content: {
        totalUnits,
        publishedUnits,
        totalLessons,
        publishedLessons,
        totalExercises,
      },
      learning: {
        completedLessonRecords,
        completionRate,
      },
      notifications: {
        totalNotifications,
        unreadNotifications,
      },
    };
  }

  async getLeaderboard(query: LeaderboardQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.page_size ?? 10;
    const skip = (page - 1) * pageSize;

    const where: Prisma.ChildProfileWhereInput = {
      ...(query.age ? { age: query.age } : {}),
      isActive: true,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.childProfile.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [
          { xpPoints: 'desc' },
          { streakCount: 'desc' },
          { createdAt: 'asc' },
        ],
        select: {
          id: true,
          displayName: true,
          age: true,
          xpPoints: true,
          streakCount: true,
          gamificationLevel: true,
        },
      }),
      this.prisma.childProfile.count({ where }),
    ]);

    return {
      items: items.map((item, index) => ({
        rank: skip + index + 1,
        ...item,
      })),
      meta: {
        total,
        page,
        page_size: pageSize,
        total_pages: Math.ceil(total / pageSize) || 1,
      },
    };
  }
}
