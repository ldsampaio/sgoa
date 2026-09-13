#!/usr/bin/env bash
# SGOA — backup do Postgres (pg_dump) + uploads.
# Uso: ./backup.sh [destino]   (padrão: ./backups)
set -euo pipefail
cd "$(dirname "$0")"
DEST="${1:-./backups}"
DATA="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$DEST"
echo "==> pg_dump..."
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U "${POSTGRES_USER:-sgoa}" "${POSTGRES_DB:-sgoa}" | gzip > "$DEST/sgoa-db-$DATA.sql.gz"
echo "==> uploads..."
docker run --rm -v sgoa-uploads:/u -v "$PWD/$DEST:/b" alpine \
  tar -czf "/b/sgoa-uploads-$DATA.tar.gz" -C /u .
ls -la "$DEST"/sgoa-*-"$DATA".*
echo "Backup concluído em $DEST."
