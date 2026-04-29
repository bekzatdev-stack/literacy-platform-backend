import { Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AsyncTasksService } from './async-tasks.service';

@ApiTags('Async Tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/jobs')
export class AsyncTasksController {
  constructor(private readonly asyncTasksService: AsyncTasksService) {}

  @Post('run-daily-streak-check')
  runDailyStreakCheck() {
    return this.asyncTasksService.runDailyStreakRiskNotifications();
  }

  @Post('run-streak-reset')
  runStreakReset() {
    return this.asyncTasksService.runBrokenStreakReset();
  }

  @Post('run-weekly-summary')
  runWeeklySummary() {
    return this.asyncTasksService.runWeeklyProgressSummaries();
  }
}
