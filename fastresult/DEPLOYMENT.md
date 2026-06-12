# Deployment Guide

## Local Docker

```bash
cp .env.example .env
docker compose up --build -d
```

## Manual Development

```bash
pnpm install
docker compose up -d postgres redis
pnpm db:generate
pnpm db:migrate
pnpm dev
```

## CI/CD Pipeline

1. Install dependencies with `pnpm install --frozen-lockfile`.
2. Run `pnpm typecheck` and `pnpm lint`.
3. Build with `pnpm build`.
4. Run database migrations against a staging database.
5. Build and push Docker images.
6. Deploy API, then web.
7. Run smoke checks for `/api`, `/docs`, and `/`.

## Production Checklist

- Replace all secrets in `.env`.
- Enable HTTPS and secure cookies.
- Configure PostgreSQL backups and point-in-time recovery.
- Configure Redis persistence and memory limits.
- Connect real email, SMS, Telegram, storage, and maps providers.
- Configure observability for logs, metrics, traces, and alerting.
- Configure data retention and GDPR export/deletion workflows.
