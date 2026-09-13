#!/usr/bin/env bash
# SGOA — restaura backup (pg_dump + uploads).
# Uso: ./restore.sh <arquivo-db.sql.gz> <arquivo-uploads.tar.gz>
# ATENÇÃO: sobrescreve o banco e os uploads atuais. Faça backup antes.
set -euo pipefail
cd "$(dirname "$0")"
[ "$#" = 2 ] || { echo "Uso: $0 <db.sql.gz> <uploads.tar.gz>"; exit 1; }
read -rp "Confirma RESTAURAR $1 + $2 sobre a produção? (digite SIM): " ok
[ "$ok" = "SIM" ] || { echo "Cancelado."; exit 1; }
echo "==> restaurando banco..."
gzip -dc "$1" | docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U "${POSTGRES_USER:-sgoa}" -d "${POSTGRES_DB:-sgoa}"
echo "==> restaurando uploads..."
docker run --rm -v sgoa-uploads:/u -v "$PWD:/b" alpine sh -c "rm -rf /u/* && tar -xzf /b/$2 -C /u"
docker compose -f docker-compose.prod.yml restart app agent worker lembretes
echo "Restore concluído."
