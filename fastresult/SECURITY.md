# Security Architecture

## Authentication

- Access tokens expire quickly and refresh tokens rotate on every renewal.
- Passwords are hashed with bcrypt and never logged.
- Sessions store device metadata, IP address, user agent, and revocation status.

## Authorization

- Role-based guards protect every API group.
- Gym-scoped records include `clubId` for tenant isolation.
- Super Admin is the only role allowed to cross tenant boundaries.

## Platform Protection

- Helmet enables secure headers.
- Global validation pipes reject unknown request fields.
- Throttler guards reduce brute force and scraping risk.
- Prisma parameterization protects SQL queries.
- Audit logs capture authentication, payments, admin actions, exports, and permission changes.

## Compliance

- User consent, privacy controls, export, and deletion flows are represented in the schema.
- Production deployments should configure backups, retention rules, key rotation, and regional data processing policies.
