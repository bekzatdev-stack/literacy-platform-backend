import { Injectable } from '@nestjs/common';
import { LeaderboardQueryDto } from './dto/leaderboard.query.dto';
import { ListAdminLogsQueryDto } from './dto/list-admin-logs.query.dto';
import { AdminRepository } from './repositories/admin.repository';

@Injectable()
export class AdminService {
  constructor(private readonly adminRepository: AdminRepository) {}

  async listLogs(query: ListAdminLogsQueryDto) {
    return this.adminRepository.listLogs(query);
  }

  async getStats() {
    return this.adminRepository.getStats();
  }

  async getLeaderboard(query: LeaderboardQueryDto) {
    return this.adminRepository.getLeaderboard(query);
  }
}
