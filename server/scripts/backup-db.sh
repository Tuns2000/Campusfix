#!/bin/bash

#############################################
# CampusFix Database Backup Script
# Автоматическое резервное копирование БД
#############################################

# Настройки
BACKUP_DIR="/var/backups/campusfix"
DATE=$(date +"%Y%m%d_%H%M%S")
DB_NAME="campusfix"
DB_USER="campusfix_user"
RETENTION_DAYS=30

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Логирование
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Проверка существования директории
if [ ! -d "$BACKUP_DIR" ]; then
    log "Creating backup directory: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
    if [ $? -ne 0 ]; then
        error "Failed to create backup directory"
        exit 1
    fi
fi

# Создание бэкапа
log "Starting database backup..."
BACKUP_FILE="$BACKUP_DIR/campusfix_db_$DATE.sql.gz"

pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log "Backup completed successfully: $BACKUP_FILE (Size: $BACKUP_SIZE)"
else
    error "Backup failed!"
    exit 1
fi

# Удаление старых бэкапов
log "Cleaning up old backups (older than $RETENTION_DAYS days)..."
OLD_BACKUPS=$(find "$BACKUP_DIR" -name "campusfix_db_*.sql.gz" -mtime +$RETENTION_DAYS)

if [ -n "$OLD_BACKUPS" ]; then
    echo "$OLD_BACKUPS" | while read -r file; do
        log "Removing old backup: $file"
        rm -f "$file"
    done
else
    log "No old backups to remove"
fi

# Статистика бэкапов
TOTAL_BACKUPS=$(find "$BACKUP_DIR" -name "campusfix_db_*.sql.gz" | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
log "Total backups: $TOTAL_BACKUPS (Total size: $TOTAL_SIZE)"

log "Backup process completed successfully!"
exit 0
