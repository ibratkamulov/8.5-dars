FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile=false

FROM deps AS builder
COPY . .
RUN pnpm --filter @fastresult/shared build
RUN pnpm --filter @fastresult/api prisma:generate
RUN pnpm --filter @fastresult/api build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
COPY --from=builder /app .
EXPOSE 4000
CMD ["pnpm", "--filter", "@fastresult/api", "start"]
