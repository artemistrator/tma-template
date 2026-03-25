#!/bin/bash
# ===========================================
# TMA Platform — Automated Backup Script
# ===========================================
#
# Backs up:
#   1. PostgreSQL database (full pg_dump)
#   2. Directus uploads (file assets)
#   3. Environment config (.env.local)
#
# Usage:
#   ./scripts/backup.sh                  # backup with defaults
#   ./scripts/backup.sh /path/to/dir     # custom backup directory
#   BACKUP_RETAIN_DAYS=30 ./scripts/backup.sh  # custom retention
#
# Cron example (daily at 3 AM):
#   0 3 * * * cd /path/to/tma-template && ./scripts/backup.sh >> /var/log/tma-backup.log 2>&1
#

set -euo pipefail

# ── Config ────────────────────────────────────────────────
BACKUP_DIR="${1:-./backups}"
RETAIN_DAYS="${BACKUP_RETAIN_DAYS:-14}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="tma_backup_${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

# Database credentials (match docker-compose.yml)
DB_CONTAINER="${DB_CONTAINER:-tma-postgres}"
DB_USER="${DB_USER:-directus}"
DB_NAME="${DB_NAME:-directus}"

# Directus uploads volume
DIRECTUS_CONTAINER="${DIRECTUS_CONTAINER:-tma-directus}"

# Telegram notification (optional)
TG_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TG_ADMIN_ID="${TELEGRAM_ADMIN_ID:-}"

# ── Helpers ───────────────────────────────────────────────
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

send_telegram() {
  if [ -n "$TG_BOT_TOKEN" ] && [ -n "$TG_ADMIN_ID" ]; then
    curl -s -X POST "https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage" \
      -d chat_id="$TG_ADMIN_ID" \
      -d text="$1" \
      -d parse_mode="HTML" > /dev/null 2>&1 || true
  fi
}

# ── Pre-checks ────────────────────────────────────────────
log "Starting backup: ${BACKUP_NAME}"

# Check Docker is running
if ! docker info > /dev/null 2>&1; then
  log "ERROR: Docker is not running"
  send_telegram "🔴 <b>Backup FAILED</b>%0ADocker is not running"
  exit 1
fi

# Check postgres container is up
if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
  log "ERROR: Container ${DB_CONTAINER} is not running"
  send_telegram "🔴 <b>Backup FAILED</b>%0APostgreSQL container not running"
  exit 1
fi

# Create backup directory
mkdir -p "${BACKUP_PATH}"

# ── 1. Database dump ─────────────────────────────────────
log "Dumping PostgreSQL..."
if docker exec "${DB_CONTAINER}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" \
  --format=custom --compress=6 \
  > "${BACKUP_PATH}/database.dump" 2>/dev/null; then
  DB_SIZE=$(du -sh "${BACKUP_PATH}/database.dump" | cut -f1)
  log "Database dump: ${DB_SIZE}"
else
  log "ERROR: pg_dump failed"
  send_telegram "🔴 <b>Backup FAILED</b>%0Apg_dump error"
  rm -rf "${BACKUP_PATH}"
  exit 1
fi

# ── 2. Directus uploads ──────────────────────────────────
log "Backing up Directus uploads..."
if docker ps --format '{{.Names}}' | grep -q "^${DIRECTUS_CONTAINER}$"; then
  docker cp "${DIRECTUS_CONTAINER}:/directus/uploads" "${BACKUP_PATH}/uploads" 2>/dev/null || {
    log "WARN: Could not copy uploads (directory may be empty)"
    mkdir -p "${BACKUP_PATH}/uploads"
  }
  UPLOADS_COUNT=$(find "${BACKUP_PATH}/uploads" -type f 2>/dev/null | wc -l | tr -d ' ')
  log "Uploads: ${UPLOADS_COUNT} files"
else
  log "WARN: Directus container not running, skipping uploads"
  mkdir -p "${BACKUP_PATH}/uploads"
fi

# ── 3. Environment config ────────────────────────────────
log "Backing up .env.local..."
if [ -f .env.local ]; then
  cp .env.local "${BACKUP_PATH}/env.local.bak"
  log "Env config saved"
else
  log "WARN: No .env.local found"
fi

# ── 4. Compress ───────────────────────────────────────────
log "Compressing..."
cd "${BACKUP_DIR}"
tar -czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}/"
rm -rf "${BACKUP_NAME}/"
cd - > /dev/null

ARCHIVE_SIZE=$(du -sh "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" | cut -f1)
log "Archive: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz (${ARCHIVE_SIZE})"

# ── 5. Cleanup old backups ────────────────────────────────
DELETED=0
if [ "$RETAIN_DAYS" -gt 0 ]; then
  while IFS= read -r old_backup; do
    rm -f "$old_backup"
    DELETED=$((DELETED + 1))
    log "Deleted old backup: $(basename "$old_backup")"
  done < <(find "${BACKUP_DIR}" -name "tma_backup_*.tar.gz" -mtime "+${RETAIN_DAYS}" -type f 2>/dev/null)
fi

# ── 6. Summary ────────────────────────────────────────────
TOTAL_BACKUPS=$(find "${BACKUP_DIR}" -name "tma_backup_*.tar.gz" -type f 2>/dev/null | wc -l | tr -d ' ')
TOTAL_SIZE=$(du -sh "${BACKUP_DIR}" 2>/dev/null | cut -f1)

log "Backup complete!"
log "  Archive: ${ARCHIVE_SIZE}"
log "  Total backups: ${TOTAL_BACKUPS} (${TOTAL_SIZE})"
log "  Retention: ${RETAIN_DAYS} days"
[ "$DELETED" -gt 0 ] && log "  Cleaned up: ${DELETED} old backups"

send_telegram "✅ <b>Backup OK</b>%0A📦 ${ARCHIVE_SIZE}%0A📁 ${TOTAL_BACKUPS} backups (${TOTAL_SIZE})%0A🗓 Retention: ${RETAIN_DAYS} days"
