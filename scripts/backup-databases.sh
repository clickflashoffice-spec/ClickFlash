#!/bin/bash
# ClickFlash Database Backup Automation Script
# Run via cron: 0 2 * * * /path/to/backup-databases.sh

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups/clickflash}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${BACKUP_DIR}/backup.log"

# Apps with SQLite databases
APPS=(
    "master:pb_data/master.db"
    "touch:pb_data/touch.db"
    "moneytrash:pb_data/moneytrash.db"
    "gallery:pb_data/gallery.db"
    "management:pb_data/management.db"
)

# Create backup directory
mkdir -p "${BACKUP_DIR}"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

backup_database() {
    local app_name="$1"
    local db_path="$2"
    local backup_file="${BACKUP_DIR}/${app_name}_${TIMESTAMP}.db"
    local compressed_file="${backup_file}.gz"
    
    if [ ! -f "${db_path}" ]; then
        log "⚠️  Database not found: ${db_path} (skipping ${app_name})"
        return 0
    fi
    
    log "📦 Backing up ${app_name}..."
    
    # Create SQLite backup (consistent snapshot)
    sqlite3 "${db_path}" ".backup '${backup_file}'"
    
    # Compress
    gzip -f "${backup_file}"
    
    # Calculate checksum
    local checksum=$(sha256sum "${compressed_file}" | awk '{print $1}')
    echo "${checksum}  ${compressed_file}" >> "${BACKUP_DIR}/checksums_${TIMESTAMP}.sha256"
    
    local size=$(du -h "${compressed_file}" | cut -f1)
    log "✅ ${app_name} backed up: ${size} (${checksum:0:16}...)"
}

# Main backup process
log "=== ClickFlash Database Backup Started ==="

for app_config in "${APPS[@]}"; do
    IFS=':' read -r app_name db_path <<< "${app_config}"
    
    # Find database in app directory
    full_path="C:/Users/alamo/Desktop/ClickFlash/apps/${app_name}/${db_path}"
    
    # Try alternative paths
    if [ ! -f "${full_path}" ]; then
        full_path="C:/Users/alamo/Desktop/ClickFlash/apps/${app_name}/backend/${db_path}"
    fi
    
    if [ ! -f "${full_path}" ]; then
        full_path="C:/Users/alamo/Desktop/ClickFlash/apps/${app_name}/dist/${db_path}"
    fi
    
    backup_database "${app_name}" "${full_path}"
done

# Upload to Cloudflare R2 (if configured)
if command -v rclone &> /dev/null && [ -f "${BACKUP_DIR}/rclone.conf" ]; then
    log "☁️  Uploading to Cloudflare R2..."
    rclone copy "${BACKUP_DIR}" "r2:clickflash-backups/${TIMESTAMP}/" --config "${BACKUP_DIR}/rclone.conf"
    log "✅ Upload complete"
fi

# Cleanup old backups
log "🧹 Cleaning up backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "*.db.gz" -mtime +${RETENTION_DAYS} -delete
find "${BACKUP_DIR}" -name "checksums_*.sha256" -mtime +${RETENTION_DAYS} -delete

# Summary
backup_count=$(find "${BACKUP_DIR}" -name "*_${TIMESTAMP}.db.gz" | wc -l)
total_size=$(du -sh "${BACKUP_DIR}" | cut -f1)

log "=== Backup Complete ==="
log "📊 Backed up: ${backup_count} databases"
log "💾 Total backup size: ${total_size}"
log "📁 Location: ${BACKUP_DIR}"
log "🕐 Next backup: $(date -d '+1 day' '+%Y-%m-%d 02:00:00')"

# Send notification (if webhook configured)
if [ -n "${DISCORD_WEBHOOK:-}" ]; then
    curl -s -X POST "${DISCORD_WEBHOOK}" \
        -H "Content-Type: application/json" \
        -d "{\"content\":\"✅ ClickFlash backup complete: ${backup_count} databases, ${total_size}\"}" > /dev/null
fi

exit 0
