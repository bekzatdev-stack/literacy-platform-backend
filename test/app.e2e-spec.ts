import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'AdminPass123';
const PARENT_PASSWORD = 'SecurePass123';

jest.setTimeout(60000);

describe('Literacy Platform API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await clearDatabase(prisma);
    await seedAdmin(prisma);
  });

  afterAll(async () => {
    await clearDatabase(prisma);
    await app.close();
    await prisma.$disconnect();
  });

  it('/api/v1/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect((response) => {
        expect(response.body.status).toBe('ok');
        expect(response.body.message).toBe(
          'Literacy Learning Platform API is running',
        );
        expect(response.body.timestamp).toEqual(expect.any(String));
      });
  });

  it('supports auth flow with refresh and logout', async () => {
    const registerResponse = await registerParent(
      app,
      'parent-auth@example.com',
    );

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.user.email).toBe('parent-auth@example.com');
    expect(registerResponse.body.user.role).toBe(UserRole.PARENT);
    expect(registerResponse.body.tokens.accessToken).toEqual(
      expect.any(String),
    );
    expect(registerResponse.body.tokens.refreshToken).toEqual(
      expect.any(String),
    );

    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'parent-auth@example.com',
        password: PARENT_PASSWORD,
      })
      .expect(200);

    expect(loginResponse.body.user.email).toBe('parent-auth@example.com');

    const refreshResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({
        refreshToken: loginResponse.body.tokens.refreshToken,
      })
      .expect(200);

    expect(refreshResponse.body.tokens.accessToken).toEqual(expect.any(String));
    expect(refreshResponse.body.tokens.refreshToken).toEqual(
      expect.any(String),
    );

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set(
        'Authorization',
        `Bearer ${loginResponse.body.tokens.accessToken as string}`,
      )
      .expect(200)
      .expect({
        message: 'Logged out successfully',
      });

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({
        refreshToken: loginResponse.body.tokens.refreshToken,
      })
      .expect(401);
  });

  it('supports child profile CRUD for a parent', async () => {
    const registerResponse = await registerParent(
      app,
      'parent-children@example.com',
    );
    const parentToken = registerResponse.body.tokens.accessToken as string;
    const parentId = registerResponse.body.user.id as string;

    const createChildResponse = await request(app.getHttpServer())
      .post('/api/v1/children')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({
        username: 'ali_reader',
        pin: '1234',
        displayName: 'Ali',
        age: 6,
        avatarUrl: 'https://example.com/avatar.png',
        learningLevel: 1,
      })
      .expect(201);

    const childId = createChildResponse.body.id as string;

    expect(createChildResponse.body.displayName).toBe('Ali');
    expect(createChildResponse.body.learningLevel).toBe(1);

    const listChildrenResponse = await request(app.getHttpServer())
      .get('/api/v1/children')
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(200);

    expect(listChildrenResponse.body.items).toHaveLength(1);
    expect(listChildrenResponse.body.items[0].id).toBe(childId);

    await request(app.getHttpServer())
      .get(`/api/v1/children/${childId}`)
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(200)
      .expect((response) => {
        expect(response.body.displayName).toBe('Ali');
        expect(response.body.parentId).toBe(parentId);
      });

    await request(app.getHttpServer())
      .put(`/api/v1/children/${childId}`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({
        displayName: 'Ali Junior',
        age: 7,
        learningLevel: 2,
      })
      .expect(200)
      .expect((response) => {
        expect(response.body.displayName).toBe('Ali Junior');
        expect(response.body.age).toBe(7);
        expect(response.body.learningLevel).toBe(2);
      });

    const parentChildrenResponse = await request(app.getHttpServer())
      .get(`/api/v1/parents/${parentId}/children`)
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(200);

    expect(parentChildrenResponse.body.items).toHaveLength(1);
    expect(parentChildrenResponse.body.items[0].displayName).toBe('Ali Junior');

    await request(app.getHttpServer())
      .delete(`/api/v1/children/${childId}`)
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(200)
      .expect({
        message: 'Child profile deleted successfully',
      });

    const emptyChildrenResponse = await request(app.getHttpServer())
      .get('/api/v1/children')
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(200);

    expect(emptyChildrenResponse.body.items).toHaveLength(0);
  });

  it('supports the full learner flow with progress, notifications, stats and logs', async () => {
    const registerResponse = await registerParent(
      app,
      'parent-flow@example.com',
    );
    const parentToken = registerResponse.body.tokens.accessToken as string;
    const parentId = registerResponse.body.user.id as string;

    const createChildResponse = await request(app.getHttpServer())
      .post('/api/v1/children')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({
        username: 'reader_flow',
        pin: '1234',
        displayName: 'Ali',
        age: 6,
        avatarUrl: 'https://example.com/avatar.png',
        learningLevel: 1,
      })
      .expect(201);

    const childId = createChildResponse.body.id as string;

    const adminLoginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      })
      .expect(200);

    const adminToken = adminLoginResponse.body.tokens.accessToken as string;

    const createUnitResponse = await request(app.getHttpServer())
      .post('/api/v1/units')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        slug: 'phonics-level-1',
        title: 'Phonics - Level 1',
        description: 'Introduction to first phonics lessons.',
        curriculumLevel: 1,
        orderIndex: 1,
        isPublished: true,
      })
      .expect(201);

    const unitId = createUnitResponse.body.id as string;

    const createLessonResponse = await request(app.getHttpServer())
      .post(`/api/v1/lessons/unit/${unitId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        slug: 'letter-a-sounds',
        title: 'Letter A Sounds',
        instructions: 'Listen and match the A sound.',
        lessonType: 'PHONICS',
        difficulty: 'BEGINNER',
        orderIndex: 1,
        xpReward: 10,
        status: 'PUBLISHED',
      })
      .expect(201);

    const lessonId = createLessonResponse.body.id as string;

    const createExerciseResponse = await request(app.getHttpServer())
      .post(`/api/v1/lessons/${lessonId}/exercises`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        type: 'PHONICS',
        difficulty: 'BEGINNER',
        orderIndex: 1,
        prompt: 'Match the letter A with its sound.',
        instructions: 'Listen carefully before selecting the answer.',
        content: {
          question: 'Which sound matches the letter A?',
          options: ['a', 'b', 'c'],
        },
        correctAnswer: {
          correctOption: 'a',
        },
      })
      .expect(201);

    const exerciseId = createExerciseResponse.body.id as string;

    await request(app.getHttpServer())
      .put(`/api/v1/units/${unitId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Phonics - Level 1 Updated',
      })
      .expect(200);

    const submitExerciseResponse = await request(app.getHttpServer())
      .post(`/api/v1/exercises/${exerciseId}/submit`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({
        childId,
        answer: {
          correctOption: 'a',
        },
        timeTakenSeconds: 12,
      })
      .expect(201);

    expect(submitExerciseResponse.body.submission.isCorrect).toBe(true);
    expect(submitExerciseResponse.body.progress.isReadyForCompletion).toBe(
      true,
    );

    const completeLessonResponse = await request(app.getHttpServer())
      .post(`/api/v1/lessons/${lessonId}/complete`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({
        childId,
      })
      .expect(201);

    expect(completeLessonResponse.body.message).toBe(
      'Lesson completed successfully',
    );
    expect(completeLessonResponse.body.awardedXp).toBe(10);
    expect(completeLessonResponse.body.child.xpPoints).toBe(10);
    expect(completeLessonResponse.body.awardedBadges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'FIRST_LESSON',
        }),
      ]),
    );

    const progressResponse = await request(app.getHttpServer())
      .get(`/api/v1/children/${childId}/progress`)
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(200);

    expect(progressResponse.body.lessonProgress).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          lessonId,
          childId,
          status: 'COMPLETED',
          earnedXp: 10,
        }),
      ]),
    );
    expect(progressResponse.body.submissions).toHaveLength(1);

    const badgesResponse = await request(app.getHttpServer())
      .get(`/api/v1/children/${childId}/badges`)
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(200);

    expect(badgesResponse.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          badge: expect.objectContaining({
            code: 'FIRST_LESSON',
          }),
        }),
      ]),
    );

    const leaderboardResponse = await request(app.getHttpServer())
      .get('/api/v1/leaderboard')
      .query({ age: 6 })
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(200);

    expect(leaderboardResponse.body.items[0]).toEqual(
      expect.objectContaining({
        rank: 1,
        id: childId,
        xpPoints: 10,
      }),
    );

    const statsResponse = await request(app.getHttpServer())
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(statsResponse.body.users.totalParents).toBe(1);
    expect(statsResponse.body.users.totalAdmins).toBe(1);
    expect(statsResponse.body.users.totalChildren).toBe(1);
    expect(statsResponse.body.content.totalUnits).toBe(1);
    expect(statsResponse.body.content.totalLessons).toBe(1);
    expect(statsResponse.body.content.totalExercises).toBe(1);
    expect(statsResponse.body.learning.completedLessonRecords).toBe(1);

    const logsResponse = await request(app.getHttpServer())
      .get('/api/v1/admin/logs')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(logsResponse.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: 'UPDATE',
          entityType: 'UNIT',
          entityId: unitId,
          admin: expect.objectContaining({
            email: ADMIN_EMAIL,
          }),
        }),
      ]),
    );

    const weeklySummaryResponse = await request(app.getHttpServer())
      .post('/api/v1/admin/jobs/run-weekly-summary')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    expect(weeklySummaryResponse.body.summariesCreated).toBe(1);

    const notificationsResponse = await request(app.getHttpServer())
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(200);

    expect(notificationsResponse.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          parentId,
          type: 'LESSON_COMPLETED',
        }),
        expect.objectContaining({
          parentId,
          type: 'WEEKLY_SUMMARY',
        }),
      ]),
    );

    const weeklyNotification = notificationsResponse.body.items.find(
      (item: { type: string }) => item.type === 'WEEKLY_SUMMARY',
    );

    expect(weeklyNotification).toBeDefined();

    await request(app.getHttpServer())
      .patch(`/api/v1/notifications/${weeklyNotification.id as string}`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({
        isRead: true,
      })
      .expect(200)
      .expect((response) => {
        expect(response.body.isRead).toBe(true);
        expect(response.body.readAt).toEqual(expect.any(String));
      });
  });
});

async function registerParent(app: INestApplication<App>, email: string) {
  return request(app.getHttpServer()).post('/api/v1/auth/register').send({
    email,
    password: PARENT_PASSWORD,
    firstName: 'Aruzhan',
    lastName: 'Bekova',
  });
}

async function seedAdmin(prisma: PrismaService) {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      passwordHash,
      firstName: 'System',
      lastName: 'Admin',
      role: UserRole.ADMIN,
    },
  });
}

async function clearDatabase(prisma: PrismaService) {
  await prisma.adminActivityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.childBadge.deleteMany();
  await prisma.exerciseSubmission.deleteMany();
  await prisma.lessonProgress.deleteMany();
  await prisma.exercise.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.badge.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.childProfile.deleteMany();
  await prisma.user.deleteMany();
}
