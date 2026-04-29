[![CI](https://github.com/bekzatdev-stack/literacy-platform-backend/actions/workflows/ci.yml/badge.svg)](https://github.com/bekzatdev-stack/literacy-platform-backend/actions/workflows/ci.yml)

# Children's Literacy Learning Platform Backend

Production-style backend for a Duolingo ABC-inspired children's literacy platform. The system supports parent onboarding, child profiles, curriculum management, progress tracking, gamification, notifications, admin analytics, and scheduled background jobs.

## Tech Stack

- NestJS + TypeScript
- PostgreSQL
- Prisma ORM
- JWT access/refresh authentication
- Swagger / OpenAPI
- Jest + Supertest
- GitHub Actions CI

## Core Features

- Parent registration and secure login
- Admin login for curriculum/content management
- Child profile CRUD with strict ownership checks
- Curriculum hierarchy: `Units -> Lessons -> Exercises`
- Exercise submission and lesson completion flow
- XP, streaks, gamification levels, badges
- Parent notifications with read/unread state
- Weekly summary and streak background jobs
- Leaderboard, admin statistics, and admin activity logs

## Architecture

The codebase follows a layered architecture:

- Controllers: parse HTTP requests and return responses
- Services: contain business logic
- Repositories: isolate database access
- Prisma: database client and migrations

This keeps controllers thin and makes the business rules easier to test and explain during the defence.

## API Base URL

- Local API base: `http://localhost:3000/api/v1`
- Local Swagger UI: `http://localhost:3000/api/docs`

## Main Roles

- `PARENT`: registers, logs in, creates and manages child profiles, views progress and notifications
- `ADMIN`: manages units, lessons, exercises, views stats/logs, runs async jobs manually for demo purposes
- `CHILD`: represented as a child profile linked to a parent account

## Environment Variables

Create a `.env` file in the project root.

```env
PORT=3000
NODE_ENV=development
APP_TIMEZONE=Asia/Almaty

DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/literacy_platform_db?schema=public"

JWT_ACCESS_SECRET="your_access_secret"
JWT_REFRESH_SECRET="your_refresh_secret"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
```

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create PostgreSQL database

Create an empty PostgreSQL database, for example:

```text
literacy_platform_db
```

Then update `DATABASE_URL` in `.env`.

### 3. Run Prisma migrations

```bash
npx prisma migrate dev --name init
```

### 4. Seed the default admin account

```bash
npm run seed:admin
```

Default admin credentials:

- Email: `admin@example.com`
- Password: `AdminPass123`

### 5. Start the development server

```bash
npm run start:dev
```

## Useful Scripts

```bash
# run dev server
npm run start:dev

# build project
npm run build

# open Prisma Studio
npm run prisma:studio

# generate Prisma client
npm run prisma:generate

# run migrations
npm run prisma:migrate

# seed admin account
npm run seed:admin

# lint
npm run lint

# lint without auto-fixing
npm run lint:check

# run all tests
npm test -- --runInBand

# coverage
npm run test:cov -- --runInBand

# e2e only
npm run test:e2e
```

## Testing

The project includes:

- Unit tests for service-layer logic
- Integration / e2e tests for critical API flows

Covered scenarios include:

- auth register/login/refresh/logout flow
- child profile CRUD
- lesson completion and progress retrieval
- XP, streak, badge, and notification-related logic

Current automated coverage is above the minimum rubric requirement:

- Line coverage: `82.09%`
- Statement coverage: `83.45%`

## Async Feature

The chosen async feature is **scheduled jobs** using `@nestjs/schedule`.

Implemented jobs:

- Daily streak risk notifications
- Broken streak reset
- Weekly progress summary notifications

For easier demo during the defence, the backend also exposes manual admin endpoints:

- `POST /api/v1/admin/jobs/run-daily-streak-check`
- `POST /api/v1/admin/jobs/run-streak-reset`
- `POST /api/v1/admin/jobs/run-weekly-summary`

## Key Demo Flow

Recommended defence flow:

1. Register a parent
2. Create a child profile
3. Log in as admin
4. Create a unit, lesson, and exercise
5. Log back in as parent
6. Submit an exercise answer
7. Complete the lesson
8. Show XP, badges, notifications, and progress history
9. Show leaderboard, admin stats, and admin logs
10. Trigger weekly summary job and show the new notification

## Security Notes

- Passwords are hashed with `bcrypt`
- Refresh tokens are hashed before storing in the database
- JWT access and refresh tokens are separated
- Role-based access control is enforced with Nest guards
- Parent ownership checks prevent access to another parent's child data
- Sensitive credentials are loaded from environment variables

## CI

GitHub Actions is configured to:

- install dependencies
- generate Prisma client
- run PostgreSQL-backed migrations
- run lint checks
- run the full test suite with coverage
- build the project

After creating the GitHub repository, add the repository-specific CI badge near the top of this README.

## Deployment

Planned deployment target:

- Render or Railway

The deployed app should expose:

- public API base URL
- public Swagger UI URL

Update this section after deployment:

- Deployment URL: `TBD`
- Swagger URL: `TBD`

## Future Improvements

- Small frontend demo for parent/child flow
- Redis caching for leaderboard
- WebSocket live notifications
- Docker Compose setup
- Adaptive exercise difficulty
