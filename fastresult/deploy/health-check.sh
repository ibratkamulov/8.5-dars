#!/usr/bin/env bash
##############################################################
# FastResult — health check
# Usage: bash deploy/health-check.sh
##############################################################

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
pass() { echo -e "  ${GREEN}✅ $*${NC}"; }
fail() { echo -e "  ${RED}❌ $*${NC}"; }
info() { echo -e "  ${CYAN}$*${NC}"; }

ERRORS=0

check() {
    local label="$1"; local cmd="$2"
    if eval "$cmd" &>/dev/null; then pass "$label"
    else fail "$label"; ERRORS=$((ERRORS + 1)); fi
}

echo ""
echo "════════════════════════════════════════"
echo "  FastResult Health Check"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "════════════════════════════════════════"
echo ""

# ── 1. PM2 processes ─────────────────────────────────────
info "── PM2 processes ──────────────────────────"
pm2 list 2>/dev/null || fail "PM2 not found"
echo ""

PM2_API_STATUS=$(pm2 jlist 2>/dev/null | python3 -c "import sys,json; apps=json.load(sys.stdin); [print(a['pm2_env']['status']) for a in apps if a['name']=='fastresult-api']" 2>/dev/null | head -1 || echo "unknown")
PM2_WEB_STATUS=$(pm2 jlist 2>/dev/null | python3 -c "import sys,json; apps=json.load(sys.stdin); [print(a['pm2_env']['status']) for a in apps if a['name']=='fastresult-web']" 2>/dev/null | head -1 || echo "unknown")

[[ "$PM2_API_STATUS" == "online" ]] && pass "fastresult-api is online" || fail "fastresult-api status: ${PM2_API_STATUS}"
[[ "$PM2_WEB_STATUS" == "online" ]] && pass "fastresult-web is online" || fail "fastresult-web status: ${PM2_WEB_STATUS}"

# ── 2. System services ───────────────────────────────────
echo ""
info "── System services ────────────────────────"
check "nginx is active"        "systemctl is-active --quiet nginx"
check "redis-server is active" "systemctl is-active --quiet redis-server"
check "postgresql is active"   "systemctl is-active --quiet postgresql"

# ── 3. Port listeners ────────────────────────────────────
echo ""
info "── Port listeners ─────────────────────────"
check "Port 3000 (Next.js) listening"    "ss -tlnp | grep -q ':3000'"
check "Port 4000 (NestJS) listening"     "ss -tlnp | grep -q ':4000'"
check "Port 80   (nginx) listening"      "ss -tlnp | grep -q ':80'"
check "Port 6379 (Redis) listening"      "ss -tlnp | grep -q ':6379'"

# ── 4. HTTP responses ────────────────────────────────────
echo ""
info "── HTTP responses ──────────────────────────"

# NestJS: check Swagger UI (always available, proves app bootstrapped)
API_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://127.0.0.1:4000/docs 2>/dev/null || echo "000")
[[ "$API_CODE" == "200" || "$API_CODE" == "301" ]] \
    && pass "NestJS (127.0.0.1:4000/docs) → HTTP ${API_CODE}" \
    || fail "NestJS (127.0.0.1:4000/docs) → HTTP ${API_CODE} (expected 200)"

# Next.js: check it returns HTML
WEB_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://127.0.0.1:3000 2>/dev/null || echo "000")
[[ "$WEB_CODE" == "200" || "$WEB_CODE" == "307" || "$WEB_CODE" == "302" ]] \
    && pass "Next.js (127.0.0.1:3000) → HTTP ${WEB_CODE}" \
    || fail "Next.js (127.0.0.1:3000) → HTTP ${WEB_CODE} (expected 200)"

# Nginx public: check frontend reachable via nginx on port 80
PUBLIC_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://13.140.160.169 2>/dev/null || echo "000")
[[ "$PUBLIC_CODE" == "200" || "$PUBLIC_CODE" == "307" || "$PUBLIC_CODE" == "302" ]] \
    && pass "Public frontend (http://13.140.160.169) → HTTP ${PUBLIC_CODE}" \
    || fail "Public frontend (http://13.140.160.169) → HTTP ${PUBLIC_CODE}"

# Nginx public: check /api/ route proxied correctly
API_PUBLIC_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://13.140.160.169/api/ 2>/dev/null || echo "000")
[[ "$API_PUBLIC_CODE" == "200" || "$API_PUBLIC_CODE" == "404" || "$API_PUBLIC_CODE" == "401" ]] \
    && pass "Public API (http://13.140.160.169/api/) → HTTP ${API_PUBLIC_CODE} (nginx routing works)" \
    || fail "Public API (http://13.140.160.169/api/) → HTTP ${API_PUBLIC_CODE}"

# Swagger via public nginx
DOCS_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://13.140.160.169/docs 2>/dev/null || echo "000")
[[ "$DOCS_CODE" == "200" ]] \
    && pass "Swagger UI (http://13.140.160.169/docs) → HTTP ${DOCS_CODE}" \
    || fail "Swagger UI (http://13.140.160.169/docs) → HTTP ${DOCS_CODE}"

# ── 5. Redis ─────────────────────────────────────────────
echo ""
info "── Redis ───────────────────────────────────"
REDIS_PONG=$(redis-cli ping 2>/dev/null || echo "FAIL")
[[ "$REDIS_PONG" == "PONG" ]] && pass "Redis responds PONG" || fail "Redis not responding"

# ── 6. Disk and memory ───────────────────────────────────
echo ""
info "── Resources ───────────────────────────────"
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5 " used (" $3 " / " $2 ")"}')
MEM_USAGE=$(free -h | awk '/^Mem:/ {print "used " $3 " / total " $2}')
echo -e "  Disk: ${DISK_USAGE}"
echo -e "  RAM:  ${MEM_USAGE}"

# Warn if disk > 85%
DISK_PCT=$(df / | awk 'NR==2 {gsub(/%/,"",$5); print $5}')
[[ "$DISK_PCT" -lt 85 ]] && pass "Disk usage OK (${DISK_PCT}%)" \
    || fail "Disk usage HIGH: ${DISK_PCT}% — clean up soon"

# ── Summary ──────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════"
if [[ "$ERRORS" -eq 0 ]]; then
    echo -e "${GREEN}  ✅ All checks passed — everything is running${NC}"
else
    echo -e "${RED}  ❌ ${ERRORS} check(s) failed — review output above${NC}"
fi
echo "════════════════════════════════════════"
echo ""
echo "  Useful links:"
echo "    http://13.140.160.169        ← Frontend"
echo "    http://13.140.160.169/docs   ← Swagger API docs"
echo "    http://13.140.160.169/api/   ← REST API base"
echo ""
