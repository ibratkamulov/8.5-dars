# FastResult Architecture

## System Overview

FastResult is a multi-tenant fitness SaaS platform. A Super Admin manages the platform, Gym Owners manage their club, Trainers manage assigned members, and Members track attendance, goals, nutrition, measurements, workouts, and subscriptions.

## Frontend

- `apps/web/src/app/page.tsx` provides a premium responsive dashboard shell.
- `apps/web/src/lib/i18n.ts` implements instant Uzbek, Russian, and English switching.
- Recharts powers analytics cards for attendance, body measurements, nutrition, and progress.
- `next-themes` provides dark and light modes.

## Backend

- `apps/api/src/main.ts` applies CORS, Helmet, validation, rate limiting, and Swagger.
- `AuthModule` provides registration, login, bcrypt hashing, JWT access tokens, refresh token session storage, and login audit records.
- `ClubsModule` provides gym discovery and package metadata.
- `AttendanceModule` supports QR check-in and attendance summaries.
- `AnalyticsModule` provides executive dashboard metrics.
- `AiModule` exposes recommendation endpoints ready to connect to an LLM provider.

## Database

The Prisma schema models:

- Users, roles, sessions, and audit logs
- Fitness clubs, trainer profiles, and member profiles
- Attendance records and QR check-ins
- Goals, body measurements, nutrition logs, workout programs
- Membership plans, memberships, payments, notifications, achievements

## API Structure

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/clubs?q=
POST /api/attendance/check-in
GET  /api/attendance/summary?memberId=
GET  /api/analytics/dashboard
GET  /api/ai/recommendations?memberId=
GET  /docs
```

## Scaling Notes

- Run API and web as separate containers behind HTTPS.
- Use managed PostgreSQL with read replicas for analytics-heavy workloads.
- Use Redis for queues, notification fan-out, rate limiting, and cache.
- Move AI recommendations to async jobs when generating reports or predictions at scale.
- Partition high-volume attendance and audit tables by month for large deployments.
