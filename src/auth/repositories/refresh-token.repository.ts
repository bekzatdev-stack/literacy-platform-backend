import { Injectable } from '@nestjs/common';
import { RefreshTokenOwnerType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async revokeAllUserTokens(userId: string) {
    return this.prisma.refreshToken.updateMany({
      where: {
        userId,
        ownerType: RefreshTokenOwnerType.USER,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  async createUserToken(userId: string, tokenHash: string, expiresAt: Date) {
    return this.prisma.refreshToken.create({
      data: {
        userId,
        ownerType: RefreshTokenOwnerType.USER,
        tokenHash,
        expiresAt,
      },
    });
  }

  async findLatestActiveUserToken(userId: string) {
    return this.prisma.refreshToken.findFirst({
      where: {
        userId,
        ownerType: RefreshTokenOwnerType.USER,
        revokedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
