import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

const ADMIN_SALT_ROUNDS = 10;

@Injectable()
export class AdminBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(AdminBootstrapService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    const shouldSeed =
      this.configService.get<string>('SEED_ADMIN_ON_STARTUP') === 'true';

    if (!shouldSeed) {
      return;
    }

    const email = this.configService.get<string>('ADMIN_EMAIL');
    const password = this.configService.get<string>('ADMIN_PASSWORD');

    if (!email || !password) {
      throw new Error(
        'SEED_ADMIN_ON_STARTUP is enabled but ADMIN_EMAIL or ADMIN_PASSWORD is missing',
      );
    }

    const existingAdmin = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingAdmin) {
      this.logger.log(`Default admin already exists: ${email}`);
      return;
    }

    const passwordHash = await bcrypt.hash(password, ADMIN_SALT_ROUNDS);

    await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName:
          this.configService.get<string>('ADMIN_FIRST_NAME') ?? 'System',
        lastName: this.configService.get<string>('ADMIN_LAST_NAME') ?? 'Admin',
        role: UserRole.ADMIN,
      },
    });

    this.logger.log(`Default admin created: ${email}`);
  }
}
