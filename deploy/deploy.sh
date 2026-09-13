#!/usr/bin/env bash
# SGOA v0.1 — deploy/atualização em produção.
# Uso (no servidor, na pasta com docker-compose.prod.yml + .env):
#   ./deploy.sh            # sobe tudo e garante o admin inicial
#   SGOA_IMAGE=ghcr.io/ldsampaio/sgoa:v0.2.0 ./deploy.sh   # atualiza versão
set -euo pipefail
cd "$(dirname "$0")"

[ -f .env ] || { echo "ERRO: .env não encontrado. Copie .env.prod.example para .env e preencha."; exit 1; }
grep -q "TROCAR_" .env && { echo "ERRO: .env ainda contém valores TROCAR_*. Preencha todos os segredos."; exit 1; }

echo "==> Baixando imagem..."
docker compose -f docker-compose.prod.yml pull app agent worker lembretes || true

echo "==> Subindo postgres + app..."
docker compose -f docker-compose.prod.yml up -d postgres app

echo "==> Aguardando API saudável..."
for i in $(seq 1 30); do
  if curl -sf http://127.0.0.1:3000/api/health > /dev/null; then
    echo "API ok."
    break
  fi
  [ "$i" = 30 ] && { echo "ERRO: API não ficou saudável."; exit 1; }
  sleep 4
done

echo "==> Garantindo admin inicial..."
docker compose -f docker-compose.prod.yml exec -T app npm run create-admin || true

echo "==> Subindo workers (kafka, agent, worker, lembretes)..."
docker compose -f docker-compose.prod.yml up -d

echo "==> Estado:"
docker compose -f docker-compose.prod.yml ps
echo "Deploy concluído. Confira https://<seu-dominio>/api/health via nginx."
