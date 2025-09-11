#!/bin/bash

# Backup script for Neurophysiology Tracker database

set -e

# Configuration
DB_PATH="./neurophysiology.db"
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="neurophysiology_backup_$DATE.db"
MAX_BACKUPS=30

echo "🗄️ Starting database backup..."

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
    echo "❌ Database file not found: $DB_PATH"
    exit 1
fi

# Create backup
echo "📋 Creating backup: $BACKUP_FILE"
cp "$DB_PATH" "$BACKUP_DIR/$BACKUP_FILE"

# Compress backup
echo "🗜️ Compressing backup..."
gzip "$BACKUP_DIR/$BACKUP_FILE"

# Clean up old backups
echo "🧹 Cleaning up old backups..."
cd "$BACKUP_DIR"
ls -t neurophysiology_backup_*.db.gz | tail -n +$((MAX_BACKUPS + 1)) | xargs -r rm

echo "✅ Backup completed successfully!"
echo "📁 Backup saved as: $BACKUP_DIR/$BACKUP_FILE.gz"

# List recent backups
echo "📋 Recent backups:"
ls -la neurophysiology_backup_*.db.gz | head -5