import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AsyncTasksRepository } from './repositories/async-tasks.repository';

const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Almaty';

@Injectable()
export class AsyncTasksService {
  private readonly logger = new Logger(AsyncTasksService.name);

  constructor(private readonly asyncTasksRepository: AsyncTasksRepository) {}

  @Cron('0 21 * * *', { timeZone: APP_TIMEZONE })
  async sendDailyStreakRiskNotifications() {
    return this.runDailyStreakRiskNotifications();
  }

  @Cron('5 0 * * *', { timeZone: APP_TIMEZONE })
  async resetBrokenStreaks() {
    return this.runBrokenStreakReset();
  }

  @Cron('0 9 * * 1', { timeZone: APP_TIMEZONE })
  async sendWeeklyProgressSummaries() {
    return this.runWeeklyProgressSummaries();
  }

  async runDailyStreakRiskNotifications() {
    const todayStart = this.getStartOfToday();
    const childrenAtRisk =
      await this.asyncTasksRepository.findChildrenAtRisk(todayStart);

    for (const child of childrenAtRisk) {
      await this.asyncTasksRepository.createNotification({
        type: 'STREAK_RISK',
        title: 'Practice reminder',
        message: `${child.displayName} has not practiced today yet. Keep the streak alive with a quick lesson.`,
        payload: {
          childId: child.id,
          reason: 'daily_streak_risk',
        },
        parent: {
          connect: {
            id: child.parentId,
          },
        },
        child: {
          connect: {
            id: child.id,
          },
        },
      });
    }

    this.logger.log(
      `Daily streak risk notifications created: ${childrenAtRisk.length}`,
    );

    return {
      notificationsCreated: childrenAtRisk.length,
      processedAt: new Date().toISOString(),
    };
  }

  async runBrokenStreakReset() {
    const yesterdayStart = this.getStartOfYesterday();
    const result =
      await this.asyncTasksRepository.resetBrokenStreaks(yesterdayStart);

    this.logger.log(`Broken streaks reset: ${result.count}`);

    return {
      streaksReset: result.count,
      processedAt: new Date().toISOString(),
    };
  }

  async runWeeklyProgressSummaries() {
    const weekStart = this.getDateDaysAgo(7);
    const parents =
      await this.asyncTasksRepository.findParentsWithWeeklyProgress(weekStart);
    let summariesCreated = 0;

    for (const parent of parents) {
      const completedLessons = parent.children.reduce(
        (sum, child) => sum + child.lessonProgressRecords.length,
        0,
      );
      const totalXp = parent.children.reduce(
        (sum, child) =>
          sum +
          child.lessonProgressRecords.reduce(
            (childSum, progress) => childSum + progress.earnedXp,
            0,
          ),
        0,
      );

      if (completedLessons === 0) {
        continue;
      }

      await this.asyncTasksRepository.createNotification({
        type: 'WEEKLY_SUMMARY',
        title: 'Weekly progress summary',
        message: `This week your children completed ${completedLessons} lessons and earned ${totalXp} XP in total.`,
        payload: {
          completedLessons,
          totalXp,
          weekStart: weekStart.toISOString(),
        },
        parent: {
          connect: {
            id: parent.id,
          },
        },
      });

      summariesCreated += 1;
    }

    this.logger.log(`Weekly summaries created: ${summariesCreated}`);

    return {
      summariesCreated,
      processedAt: new Date().toISOString(),
    };
  }

  private getStartOfToday() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  private getStartOfYesterday() {
    const todayStart = this.getStartOfToday();
    return new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
  }

  private getDateDaysAgo(days: number) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  }
}
