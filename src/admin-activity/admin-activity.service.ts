import { Injectable } from '@nestjs/common';
import { AdminAction, ContentEntityType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: {
    adminId: string;
    action: AdminAction;
    entityType: ContentEntityType;
    entityId: string;
    beforeData?: object | null;
    afterData?: object | null;
  }) {
    return this.prisma.adminActivityLog.create({
      data: {
        adminId: input.adminId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        beforeData: input.beforeData
          ? (input.beforeData as Prisma.InputJsonValue)
          : undefined,
        afterData: input.afterData
          ? (input.afterData as Prisma.InputJsonValue)
          : undefined,
      },
    });
  }
}
