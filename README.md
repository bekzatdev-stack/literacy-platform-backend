[![CI](https://github.com/bekzatdev-stack/literacy-platform-backend/actions/workflows/ci.yml/badge.svg)](https://github.com/bekzatdev-stack/literacy-platform-backend/actions/workflows/ci.yml)

# Children's Literacy Learning Platform Backend

Production-style backend for a Duolingo ABC-inspired children's literacy platform. The system supports parent onboarding, child profiles, curriculum management, progress tracking, gamification, notifications, admin analytics, scheduled background jobs, and a lightweight built-in demo frontend.

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
- Parent profile read/update endpoints
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

- Local demo frontend: `http://localhost:3000/`
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
SEED_ADMIN_ON_STARTUP="false"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="AdminPass123"
ADMIN_FIRST_NAME="System"
ADMIN_LAST_NAME="Admin"
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

After startup you can use:

- `http://localhost:3000/` for the built-in demo frontend
- `http://localhost:3000/api/docs` for Swagger UI

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
- parent profile update
- lesson completion and progress retrieval
- sequential lesson restriction
- hidden draft content access protection
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

## API Notes

- `PUT /api/v1/parents/:id` updates a parent profile
- `GET /api/v1/lessons/:lessonId/exercises` returns paginated data in the shape:
  `items + meta`
- `GET /api/v1/children/:id/progress` returns paginated `lessonProgress` and
  paginated `submissions`, each with its own `items + meta`
- Parent users can access only published units, published lessons, and exercises
  that belong to published lessons
- Lessons must be completed sequentially inside a unit

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

## Demo Frontend

The project now includes a small built-in frontend demo served directly by the NestJS app from the root path `/`.

This demo page allows you to:

- register or log in a parent
- log in as admin
- create a child profile
- create a unit, lesson, and exercise
- submit an exercise
- complete a lesson
- load progress, badges, and notifications
- trigger the weekly summary background job

The demo frontend uses the same backend API under `/api/v1` and is intended for presentation and deployment demos.

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

Prepared deployment target:

- Render via `render.yaml`

The deployed app should expose:

- public demo frontend URL
- public API base URL
- public Swagger UI URL

### Render setup

The repository includes [render.yaml](/Users/bekzatmuratov/Documents/Codex/2026-04-27-new-chat/literacy-platform-backend/render.yaml:1), which defines:

- one Node.js web service
- one Render Postgres database
- generated JWT secrets
- a `DATABASE_URL` connection from the web service to the database
- startup-based admin seeding through environment variables

The Render web service uses:

- Build command: `npm ci && npx prisma generate && npm run build && npx prisma migrate deploy`
- Start command: `npm run start:prod`

During the initial Blueprint creation flow, Render prompts you for:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

Because these values are defined with `sync: false` in `render.yaml`.

At runtime, if `SEED_ADMIN_ON_STARTUP=true`, the application checks whether that admin already exists and creates it automatically if not.

After deployment, the same service should expose:

- `/` for the demo frontend
- `/api/v1` for the API
- `/api/docs` for Swagger UI

Update this section after deployment:

- Deployment URL: `TBD`
- Demo Frontend URL: `TBD`
- Swagger URL: `TBD`

## Future Improvements

- Redis caching for leaderboard
- WebSocket live notifications
- Docker Compose setup
- Adaptive exercise difficulty
