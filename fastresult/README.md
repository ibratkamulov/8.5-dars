# FastResult

FastResult is an enterprise-grade fitness management platform for clubs, trainers, owners, members, and SaaS administrators.

## Stack

- Frontend: Next.js, TypeScript, Tailwind CSS, Framer Motion, Recharts
- Backend: NestJS, TypeScript, Prisma, PostgreSQL, Redis
- Security: JWT access and refresh tokens, bcrypt, RBAC, Helmet, rate limiting, audit logs
- Integrations: Google Maps, Cloudinary or S3, Telegram, email, SMS-ready notification adapters

## Monorepo

```text
apps/web      Next.js client and dashboards
apps/api      NestJS API and Prisma schema
packages/shared  Shared roles, DTOs, i18n keys, and domain types
```

## Quick Start

```bash
cp .env.example .env
pnpm install
docker compose up -d postgres redis
pnpm db:generate
pnpm db:migrate
pnpm --filter @fastresult/api seed
pnpm dev
```

Open:

- Web: http://localhost:3000
- API: http://localhost:4000/api
- Swagger: http://localhost:4000/docs

## Production

```bash
cp .env.example .env
docker compose up --build -d
```

Use managed PostgreSQL and Redis in production, rotate JWT secrets, enable HTTPS at the load balancer, configure object storage, and provide real notification provider credentials.

## Demo Accounts

All seeded users use the password `FastResult123`.

- `admin@fastresult.uz` - Super Admin
- `owner@fastresult.uz` - Gym Owner
- `trainer@fastresult.uz` - Trainer
- `member@fastresult.uz` - Member
