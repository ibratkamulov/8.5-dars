#!/usr/bin/env bash
##############################################################
# FastResult — one-time VPS setup
# Ubuntu 22.04 / 24.04 LTS
# Run as root: bash deploy/setup.sh
##############################################################
set -euo pipefail

# ── Colours ──────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()   { echo -e "${GREEN}  ✓ $*${NC}"; }
info() { echo -e "${YELLOW}  → $*${NC}"; }
fail() { echo -e "${RED}  ✗ $*${NC}"; exit 1; }

APP_DIR="/var/www/fastresult"
LOG_DIR="/var/log/fastresult"
PNPM_VERSION="9.12.3"      # matches packageManager field in package.json
NODE_MAJOR="22"             # Node.js 22 LTS
DB_NAME="fastresult"
DB_USER="fastresult"

echo ""
echo "════════════════════════════════════════"
echo "  FastResult VPS Setup"
echo "════════════════════════════════════════"

# ── 1. System update ─────────────────────────────────────
info "[1/10] System update"
apt-get update -y
apt-get upgrade -y
apt-get install -y curl git build-essential unzip ufw gnupg lsb-release ca-certificates
ok "System packages updated"

# ── 2. Node.js 22 LTS ────────────────────────────────────
info "[2/10] Node.js ${NODE_MAJOR} LTS"
curl -fsSL https://deb.nodesource.com/setup_${NODE_MAJOR}.x | bash -
apt-get install -y nodejs
node --version && npm --version
ok "Node.js $(node --version) installed"

# ── 3. pnpm + PM2 ────────────────────────────────────────
info "[3/10] pnpm@${PNPM_VERSION} and PM2"
npm install -g pnpm@${PNPM_VERSION}
npm install -g pm2
pnpm --version && pm2 --version
ok "pnpm $(pnpm --version) and PM2 $(pm2 --version) installed"

# ── 4. Nginx ─────────────────────────────────────────────
info "[4/10] Nginx"
apt-get install -y nginx
systemctl enable nginx
systemctl start nginx
ok "Nginx $(nginx -v 2>&1 | grep -o '[0-9.]*$') installed and running"

# ── 5. Redis ─────────────────────────────────────────────
info "[5/10] Redis"
apt-get install -y redis-server

# Harden Redis: bind to localhost only, enable persistence, limit memory
REDIS_CONF="/etc/redis/redis.conf"
cp "${REDIS_CONF}" "${REDIS_CONF}.bak"

# bind to 127.0.0.1 only (no external access)
sed -i 's/^bind .*/bind 127.0.0.1/' "${REDIS_CONF}"

# enable append-only persistence
sed -i 's/^appendonly no/appendonly yes/' "${REDIS_CONF}"

# memory limit with LRU eviction (prevents OOM)
grep -qxF 'maxmemory 256mb' "${REDIS_CONF}" \
    || echo 'maxmemory 256mb' >> "${REDIS_CONF}"
grep -qxF 'maxmemory-policy allkeys-lru' "${REDIS_CONF}" \
    || echo 'maxmemory-policy allkeys-lru' >> "${REDIS_CONF}"

systemctl enable redis-server
systemctl restart redis-server
redis-cli ping | grep -q PONG && ok "Redis running (localhost only, 256 MB limit)" \
    || fail "Redis did not start"

# ── 6. PostgreSQL 17 ─────────────────────────────────────
info "[6/10] PostgreSQL 17"
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
    | gpg --dearmor -o /usr/share/keyrings/postgresql.gpg
echo "deb [signed-by=/usr/share/keyrings/postgresql.gpg] https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
    > /etc/apt/sources.list.d/pgdg.list
apt-get update -y
apt-get install -y postgresql-17
systemctl enable postgresql
systemctl start postgresql
ok "PostgreSQL $(psql --version | grep -o '[0-9]*\.[0-9]*' | head -1) installed"

# Create DB user and database
info "  Creating database user and schema"
read -rsp "  Enter password for PostgreSQL user '$DB_USER': " DB_PASS
echo ""
sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';" 2>/dev/null \
    || sudo -u postgres psql -c "ALTER USER ${DB_USER} WITH PASSWORD '${DB_PASS}';"
sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"
ok "Database '${DB_NAME}' ready — user '${DB_USER}' created"
echo ""
echo -e "  ${YELLOW}⚠  Remember this password — you need it for DATABASE_URL in .env${NC}"
echo -e "  ${YELLOW}   DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}${NC}"
echo ""

# ── 7. App and log directories ───────────────────────────
info "[7/10] App and log directories"
mkdir -p "${APP_DIR}" "${LOG_DIR}"
ok "Directories created: ${APP_DIR} and ${LOG_DIR}"

# ── 8. Nginx config ──────────────────────────────────────
info "[8/10] Nginx config"

if [[ -f "${APP_DIR}/deploy/nginx/fastresult-ip.conf" ]]; then
    cp "${APP_DIR}/deploy/nginx/fastresult-ip.conf" /etc/nginx/sites-available/fastresult
    ln -sf /etc/nginx/sites-available/fastresult /etc/nginx/sites-enabled/fastresult
    rm -f /etc/nginx/sites-enabled/default
    nginx -t && systemctl reload nginx
    ok "Nginx config deployed and reloaded"
else
    echo -e "  ${YELLOW}⚠  Repo not cloned yet — run nginx setup manually after cloning:${NC}"
    echo "     cp ${APP_DIR}/deploy/nginx/fastresult-ip.conf /etc/nginx/sites-available/fastresult"
    echo "     ln -sf /etc/nginx/sites-available/fastresult /etc/nginx/sites-enabled/fastresult"
    echo "     rm -f /etc/nginx/sites-enabled/default"
    echo "     nginx -t && systemctl reload nginx"
fi

# ── 9. UFW firewall ──────────────────────────────────────
info "[9/10] UFW firewall"
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp   comment "SSH"
ufw allow 80/tcp   comment "HTTP"
ufw allow 443/tcp  comment "HTTPS (future SSL)"
ufw --force enable
ok "UFW enabled: 22/tcp + 80/tcp + 443/tcp open"

# ── 10. PM2 systemd startup ──────────────────────────────
info "[10/10] PM2 startup"
# Generate startup command — user must run the printed command manually
PM2_STARTUP=$(pm2 startup systemd -u root --hp /root 2>&1 | grep 'sudo' | tail -1 || true)
if [[ -n "${PM2_STARTUP}" ]]; then
    eval "${PM2_STARTUP}"
    ok "PM2 registered with systemd"
else
    echo -e "  ${YELLOW}⚠  Run this to register PM2 on boot:${NC}"
    echo "     pm2 startup systemd -u \$USER --hp \$HOME"
    echo "     (copy and run the printed command)"
fi

# ── Done ─────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════"
echo -e "${GREEN}  ✓ Setup complete!${NC}"
echo "════════════════════════════════════════"
echo ""
echo "  NEXT STEPS:"
echo ""
echo "  1. Clone your repo (if not done yet):"
echo "     cd /var/www && git clone https://github.com/YOUR_USER/fastresult.git fastresult"
echo ""
echo "  2. Create .env files:"
echo "     cp ${APP_DIR}/apps/api/.env.production.example ${APP_DIR}/apps/api/.env"
echo "     nano ${APP_DIR}/apps/api/.env"
echo "       → Fill in DATABASE_URL, JWT secrets (openssl rand -base64 64), WEB_ORIGIN"
echo ""
echo "     cp ${APP_DIR}/apps/web/.env.production.example ${APP_DIR}/apps/web/.env.production"
echo "     nano ${APP_DIR}/apps/web/.env.production"
echo "       → NEXT_PUBLIC_API_URL=http://13.140.160.169 (already set)"
echo ""
echo "  3. Deploy:"
echo "     cd ${APP_DIR} && bash deploy/deploy.sh"
echo ""
echo "  4. Verify:"
echo "     bash ${APP_DIR}/deploy/health-check.sh"
echo ""
