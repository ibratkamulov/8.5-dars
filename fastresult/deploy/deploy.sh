#!/usr/bin/env bash
##############################################################
# FastResult — deployment script
# Run on every release: bash deploy/deploy.sh
# Flags: --skip-build  (PM2 reload only, no rebuild)
##############################################################
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { echo -e "${GREEN}  ✓ $*${NC}"; }
info() { echo -e "${CYAN}  → $*${NC}"; }
warn() { echo -e "${YELLOW}  ⚠ $*${NC}"; }
fail() { echo -e "${RED}  ✗ $*${NC}"; exit 1; }

SKIP_BUILD=false
for arg in "$@"; do [[ "$arg" == "--skip-build" ]] && SKIP_BUILD=true; done

APP_DIR="/var/www/fastresult"

# ── Guard: must run from the app directory ───────────────
if [[ "$(pwd)" != "${APP_DIR}" ]]; then
    warn "Not in ${APP_DIR} — switching..."
    cd "${APP_DIR}" || fail "Cannot cd to ${APP_DIR}. Is the repo cloned?"
fi

echo ""
echo "════════════════════════════════════════"
echo "  FastResult Deploy — $(date '+%Y-%m-%d %H:%M:%S')"
echo "════════════════════════════════════════"

# ── 1. Check required .env files ─────────────────────────
info "[1/7] Checking env files"
if [[ ! -f "apps/api/.env" ]]; then
    fail "apps/api/.env is missing!\n  Run: cp apps/api/.env.production.example apps/api/.env && nano apps/api/.env"
fi
if [[ ! -f "apps/web/.env.production" ]]; then
    fail "apps/web/.env.production is missing!\n  Run: cp apps/web/.env.production.example apps/web/.env.production"
fi
ok ".env files present"

# ── 2. Pull latest code ──────────────────────────────────
info "[2/7] git pull origin main"
git pull origin main
ok "Code up to date"

# ── 3. Install dependencies ──────────────────────────────
info "[3/7] pnpm install"
pnpm install --frozen-lockfile
ok "Dependencies installed"

if [[ "$SKIP_BUILD" == "true" ]]; then
    warn "Build skipped (--skip-build flag)"
else
    # ── 4. Build shared package first ────────────────────
    info "[4/7] Build @fastresult/shared"
    pnpm --filter @fastresult/shared build
    ok "Shared package built"

    # ── 4b. Build API ─────────────────────────────────────
    info "[4/7] Build @fastresult/api (NestJS)"
    cd apps/api
    pnpm build
    cd ../..
    ok "API built → apps/api/dist/"

    # ── 4c. Build web ─────────────────────────────────────
    # .env.production is loaded automatically by next build (NODE_ENV=production)
    # NEXT_PUBLIC_* vars are baked into the bundle here
    info "[4/7] Build @fastresult/web (Next.js)"
    cd apps/web
    pnpm build
    cd ../..
    ok "Web built → apps/web/.next/"
fi

# ── 5. Prisma migrations ─────────────────────────────────
info "[5/7] Prisma migrate deploy"
cd apps/api
# 'migrate deploy' applies pending migrations — never resets data
npx prisma migrate deploy
npx prisma generate
cd ../..
ok "Database schema up to date"

# ── 6. PM2 reload (zero-downtime) ────────────────────────
info "[6/7] PM2 reload"
if pm2 list | grep -q "fastresult-api"; then
    pm2 reload deploy/ecosystem.config.js --env production
    ok "PM2 processes reloaded (zero-downtime)"
else
    pm2 start deploy/ecosystem.config.js --env production
    pm2 save
    ok "PM2 processes started for the first time"
fi

# ── 7. Save PM2 process list ─────────────────────────────
info "[7/7] pm2 save"
pm2 save
ok "PM2 process list saved (survives reboots)"

# ── Summary ──────────────────────────────────────────────
echo ""
pm2 list
echo ""
echo "════════════════════════════════════════"
echo -e "${GREEN}  ✓ Deploy complete!${NC}"
echo "════════════════════════════════════════"
echo ""
echo -e "  ${GREEN}✅ App running at:   http://13.140.160.169${NC}"
echo -e "  ${GREEN}✅ API docs at:      http://13.140.160.169/docs${NC}"
echo -e "  ${GREEN}✅ API base at:      http://13.140.160.169/api${NC}"
echo ""
echo "  Tail logs:"
echo "    pm2 logs fastresult-api --lines 50"
echo "    pm2 logs fastresult-web --lines 50"
echo ""
