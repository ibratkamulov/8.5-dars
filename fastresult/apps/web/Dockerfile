FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile=false

FROM deps AS builder
COPY . .
RUN pnpm --filter @fastresult/shared build
RUN pnpm --filter @fastresult/web build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
COPY --from=builder /app .
EXPOSE 3000
CMD ["pnpm", "--filter", "@fastresult/web", "start"]
