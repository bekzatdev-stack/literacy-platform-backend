import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AdminActivityModule } from './admin-activity/admin-activity.module';
import { AdminModule } from './admin/admin.module';
import { AsyncTasksModule } from './async-tasks/async-tasks.module';
import { AuthModule } from './auth/auth.module';
import { ChildrenModule } from './children/children.module';
import { validateEnv } from './config/env.validation';
import { ExercisesModule } from './exercises/exercises.module';
import { HealthModule } from './health/health.module';
import { LessonsModule } from './lessons/lessons.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ParentsModule } from './parents/parents.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProgressModule } from './progress/progress.module';
import { UnitsModule } from './units/units.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ScheduleModule.forRoot(),
    AdminActivityModule,
    PrismaModule,
    AuthModule,
    AdminModule,
    AsyncTasksModule,
    ChildrenModule,
    UnitsModule,
    LessonsModule,
    ExercisesModule,
    ProgressModule,
    NotificationsModule,
    ParentsModule,
    HealthModule,
  ],
})
export class AppModule {}
