import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { LeaderboardQueryDto } from './dto/leaderboard.query.dto';
import { ListAdminLogsQueryDto } from './dto/list-admin-logs.query.dto';
import { AdminService } from './admin.service';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Roles(UserRole.ADMIN)
  @Get('admin/logs')
  listLogs(@Query() query: ListAdminLogsQueryDto) {
    return this.adminService.listLogs(query);
  }

  @Roles(UserRole.ADMIN)
  @Get('admin/stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Roles(UserRole.PARENT, UserRole.ADMIN)
  @Get('leaderboard')
  getLeaderboard(@Query() query: LeaderboardQueryDto) {
    return this.adminService.getLeaderboard(query);
  }
}
