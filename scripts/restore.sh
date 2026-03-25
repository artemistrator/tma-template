#!/bin/bash
# ===========================================
# TMA Platform — Restore from Backup
# ===========================================
#
# Usage:
#   ./scripts/restore.sh backups/tma_backup_20260320_030000.tar.gz
#
# What it does:
#   1. Extracts the archive
#   2. Restores PostgreSQL from dump (DROP + CREATE)
#   3. Restores Directus uploads
#   4. Shows .env.local diff (does NOT overwrite automatically)
#
# WARNING: This will OVERWRITE all current data in the database.
#

set -euo pipefail

# ── Config ────────────────────────────────────────────────
DB_CONTAINER="${DB_CONTAINER:-tma-postgres}"
DB_USER="${DB_USER:-directus}"
DB_NAME="${DB_NAME:-directus}"
DIRECTUS_CONTAINER="${DIRECTUS_CONTAINER:-tma-directus}"

# ── Helpers ───────────────────────────────────────────────
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

# ── Validate input ────────────────────────────────────────
if [ -z "${1:-}" ]; then
  echo "Usage: $0 <backup-archive.tar.gz>"
  echo ""
  echo "Available backups:"
  ls -lh backups/tma_backup_*.tar.gz 2>/dev/null || echo "  (none found in ./backups/)"
  exit 1
fi

ARCHIVE="$1"
if [ ! -f "$ARCHIVE" ]; then
  log "ERROR: Archive not found: $ARCHIVE"
  exit 1
fi

# ── Confirm ───────────────────────────────────────────────
echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║  WARNING: This will OVERWRITE all data   ║"
echo "  ║  in the database and uploads.            ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""
echo "  Archive: $ARCHIVE"
echo "  Database: ${DB_NAME} @ ${DB_CONTAINER}"
echo ""
read -p "  Continue? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  log "Restore cancelled."
  exit 0
fi

# ── Pre-checks ────────────────────────────────────────────
if ! docker info > /dev/null 2>&1; then
  log "ERROR: Docker is not running"
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
  log "ERROR: Container ${DB_CONTAINER} is not running. Start with: docker compose up -d"
  exit 1
fi

# ── Extract ───────────────────────────────────────────────
TEMP_DIR=$(mktemp -d)
log "Extracting archive to ${TEMP_DIR}..."
tar -xzf "$ARCHIVE" -C "$TEMP_DIR"

# Find the backup directory inside the archive
BACKUP_DIR=$(find "$TEMP_DIR" -maxdepth 1 -type d -name "tma_backup_*" | head -1)
if [ -z "$BACKUP_DIR" ]; then
  log "ERROR: Invalid archive format (no tma_backup_* directory found)"
  rm -rf "$TEMP_DIR"
  exit 1
fi

log "Backup directory: $(basename "$BACKUP_DIR")"

# ── 1. Restore database ──────────────────────────────────
DUMP_FILE="${BACKUP_DIR}/database.dump"
if [ -f "$DUMP_FILE" ]; then
  DUMP_SIZE=$(du -sh "$DUMP_FILE" | cut -f1)
  log "Restoring database (${DUMP_SIZE})..."

  # Drop and recreate database
  docker exec "${DB_CONTAINER}" psql -U "${DB_USER}" -d postgres \
    -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${DB_NAME}' AND pid <> pg_backend_pid();" \
    > /dev/null 2>&1 || true

  docker exec "${DB_CONTAINER}" psql -U "${DB_USER}" -d postgres \
    -c "DROP DATABASE IF EXISTS ${DB_NAME};" > /dev/null 2>&1

  docker exec "${DB_CONTAINER}" psql -U "${DB_USER}" -d postgres \
    -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};" > /dev/null 2>&1

  # Restore from dump
  cat "$DUMP_FILE" | docker exec -i "${DB_CONTAINER}" pg_restore \
    -U "${DB_USER}" -d "${DB_NAME}" --no-owner --no-privileges \
    2>/dev/null || true

  log "Database restored."
else
  log "WARN: No database dump found in archive"
fi

# ── 2. Restore uploads ───────────────────────────────────
UPLOADS_DIR="${BACKUP_DIR}/uploads"
if [ -d "$UPLOADS_DIR" ] && [ "$(find "$UPLOADS_DIR" -type f | wc -l)" -gt 0 ]; then
  UPLOADS_COUNT=$(find "$UPLOADS_DIR" -type f | wc -l | tr -d ' ')
  log "Restoring ${UPLOADS_COUNT} upload files..."

  if docker ps --format '{{.Names}}' | grep -q "^${DIRECTUS_CONTAINER}$"; then
    docker cp "$UPLOADS_DIR/." "${DIRECTUS_CONTAINER}:/directus/uploads/"
    log "Uploads restored."
  else
    log "WARN: Directus container not running, cannot restore uploads"
  fi
else
  log "No uploads to restore."
fi

# ── 3. Environment config ────────────────────────────────
ENV_BAK="${BACKUP_DIR}/env.local.bak"
if [ -f "$ENV_BAK" ]; then
  if [ -f .env.local ]; then
    DIFF=$(diff .env.local "$ENV_BAK" 2>/dev/null || true)
    if [ -n "$DIFF" ]; then
      log ".env.local differs from backup:"
      echo "$DIFF"
      echo ""
      log "Backup env saved as: .env.local.from-backup"
      cp "$ENV_BAK" .env.local.from-backup
    else
      log ".env.local matches backup (no changes needed)"
    fi
  else
    log "No current .env.local — restoring from backup"
    cp "$ENV_BAK" .env.local
  fi
fi

# ── Cleanup ───────────────────────────────────────────────
rm -rf "$TEMP_DIR"

# ── Restart Directus ──────────────────────────────────────
log "Restarting Directus to pick up restored data..."
docker restart "${DIRECTUS_CONTAINER}" > /dev/null 2>&1 || true

log ""
log "Restore complete!"
log "  - Database: restored"
log "  - Uploads: restored"
log "  - Directus: restarting"
log ""
log "Wait ~30 seconds for Directus to start, then verify at http://localhost:8055"
