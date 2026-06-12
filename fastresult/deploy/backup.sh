#!/usr/bin/env bash
##############################################################
# FastResult — automated backup script
# Backs up: PostgreSQL database + uploaded files
# Schedule: crontab -e → add:
#   0 3 * * * /var/www/fastresult/deploy/backup.sh
##############################################################
set -euo pipefail

BACKUP_DIR="/var/backups/fastresult"
LOG_FILE="/var/log/fastresult/backup.log"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
KEEP_DAYS=7
DB_NAME="fastresult"
UPLOADS_DIR="/var/www/fastresult/apps/api/uploads"
WORK_DIR="${BACKUP_DIR}/tmp_${DATE}"
ARCHIVE="${BACKUP_DIR}/fastresult-${DATE}.tar.gz"

# ── Helpers ──────────────────────────────────────────────
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "${LOG_FILE}"; }

# ── Ensure dirs exist ────────────────────────────────────
mkdir -p "${BACKUP_DIR}" "${WORK_DIR}"
mkdir -p "$(dirname "${LOG_FILE}")"

log "════════════ Backup started ════════════"

# ── 1. Database dump ─────────────────────────────────────
log "→ Dumping PostgreSQL database '${DB_NAME}'"
if sudo -u postgres pg_dump "${DB_NAME}" > "${WORK_DIR}/database.sql"; then
    gzip "${WORK_DIR}/database.sql"
    DB_SIZE=$(du -sh "${WORK_DIR}/database.sql.gz" | cut -f1)
    log "✓ Database dump: ${DB_SIZE} (database.sql.gz)"
else
    log "✗ Database dump FAILED"
    exit 1
fi

# ── 2. Uploads / media files ─────────────────────────────
if [[ -d "${UPLOADS_DIR}" ]]; then
    log "→ Copying uploads from ${UPLOADS_DIR}"
    cp -r "${UPLOADS_DIR}" "${WORK_DIR}/uploads"
    UPLOADS_SIZE=$(du -sh "${WORK_DIR}/uploads" | cut -f1)
    log "✓ Uploads copied: ${UPLOADS_SIZE}"
else
    log "  (no uploads directory found — skipping)"
fi

# ── 3. Create archive ────────────────────────────────────
log "→ Creating archive ${ARCHIVE}"
tar -czf "${ARCHIVE}" -C "${BACKUP_DIR}" "tmp_${DATE}"
ARCHIVE_SIZE=$(du -sh "${ARCHIVE}" | cut -f1)
log "✓ Archive created: ${ARCHIVE_SIZE}"

# ── 4. Cleanup working directory ─────────────────────────
rm -rf "${WORK_DIR}"

# ── 5. Delete old backups ────────────────────────────────
log "→ Deleting backups older than ${KEEP_DAYS} days"
DELETED=$(find "${BACKUP_DIR}" -maxdepth 1 -name "fastresult-*.tar.gz" \
    -mtime +"${KEEP_DAYS}" -print -delete | wc -l)
log "✓ Deleted ${DELETED} old backup(s)"

# ── 6. List current backups ──────────────────────────────
BACKUP_COUNT=$(find "${BACKUP_DIR}" -maxdepth 1 -name "fastresult-*.tar.gz" | wc -l)
BACKUP_TOTAL=$(du -sh "${BACKUP_DIR}" 2>/dev/null | cut -f1)
log "  Stored backups: ${BACKUP_COUNT} files, total ${BACKUP_TOTAL}"

log "════════════ Backup complete ════════════"
echo ""
echo "✅ Backup saved to: ${ARCHIVE} (${ARCHIVE_SIZE})"
echo ""
echo "To restore database from backup:"
echo "  tar -xzf ${ARCHIVE} -C /tmp"
echo "  gunzip /tmp/tmp_${DATE}/database.sql.gz"
echo "  sudo -u postgres psql ${DB_NAME} < /tmp/tmp_${DATE}/database.sql"
echo ""
echo "Crontab line for daily 3 AM backup:"
echo "  0 3 * * * /var/www/fastresult/deploy/backup.sh"
