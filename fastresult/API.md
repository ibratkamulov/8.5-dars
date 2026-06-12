# API Design

## Authentication

All protected endpoints use `Authorization: Bearer <accessToken>`.

### Register

`POST /api/auth/register`

```json
{
  "email": "owner@fastresult.uz",
  "fullName": "Gym Owner",
  "password": "StrongPass123",
  "role": "GYM_OWNER"
}
```

### Login

`POST /api/auth/login`

```json
{
  "email": "owner@fastresult.uz",
  "password": "StrongPass123"
}
```

## Role Permissions

- `SUPER_ADMIN`: platform-wide clubs, users, payments, statistics, settings, reports, and security logs
- `GYM_OWNER`: own club, trainers, members, packages, attendance, progress, and revenue
- `TRAINER`: assigned members, workouts, nutrition plans, reports, and goal tracking
- `MEMBER`: own profile, attendance, workouts, nutrition, trainer comments, and goals

## Core Endpoints

- `GET /api/clubs`: gym discovery, ratings, trainers, prices, and map metadata
- `POST /api/attendance/check-in`: QR attendance entry
- `GET /api/attendance/summary`: total, weekly, monthly, percentage, streak, and missed-day analytics
- `GET /api/analytics/dashboard`: SaaS and club dashboard metrics
- `GET /api/ai/recommendations`: workout, nutrition, progress, prediction, and suggestion payloads

## Future Provider Adapters

- Email: SMTP, SendGrid, Amazon SES
- SMS: Twilio, Eskiz, local aggregators
- Telegram: Bot API webhook and queued delivery
- Storage: Cloudinary or AWS S3
- Maps: Google Maps API or OpenStreetMap tiles
