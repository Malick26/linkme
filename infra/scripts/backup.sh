#!/usr/bin/env bash
# Sauvegarde PostgreSQL + médias, rotation 14 jours. Cron : 0 3 * * * /opt/linkme/infra/scripts/backup.sh
set -euo pipefail
cd "$(dirname "$0")/.."            # infra/
set -a; . ./.env; set +a
DEST="${BACKUP_DIR:-/var/backups/linkme}"
STAMP="$(date +%F-%H%M)"
mkdir -p "$DEST"

docker compose exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$DEST/db-$STAMP.sql.gz"
docker run --rm -v linkme_media:/data -v "$DEST":/out alpine tar czf "/out/media-$STAMP.tar.gz" -C /data .

find "$DEST" -name 'db-*.sql.gz' -mtime +14 -delete
find "$DEST" -name 'media-*.tar.gz' -mtime +14 -delete
echo "✔ Sauvegarde : $DEST/db-$STAMP.sql.gz + media-$STAMP.tar.gz"

# Restauration :
#   gunzip -c db-XXXX.sql.gz | docker compose exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
#   docker run --rm -v linkme_media:/data -v "$PWD":/in alpine tar xzf /in/media-XXXX.tar.gz -C /data
