# SGOA v0.1 — Guia de produção (servidor da universidade)

Topologia: **container único** (`app`: API + frontend buildado na mesma origem),
**Postgres 17**, **Kafka** e workers (`agent`, `worker`, `lembretes`) — todos via
`docker-compose.prod.yml`. O **nginx + Cloudflared Tunnel do servidor** fazem o
proxy reverso/HTTPS para `http://127.0.0.1:3000`.

## 1. Pré-requisitos no servidor

- Docker Engine + plugin Compose (`docker compose version`)
- Portas 80/443 para nginx + Cloudflared (infra existente da universidade)

## 2. Instalação

```bash
mkdir -p /opt/sgoa && cd /opt/sgoa
# copiar: docker-compose.prod.yml, .env.prod.example -> .env, deploy.sh, backup.sh, restore.sh
cp .env.prod.example .env
nano .env   # preencher TODOS os segredos (nada de TROCAR_*)
chmod +x deploy.sh backup.sh restore.sh
./deploy.sh
```

O `deploy.sh` valida o `.env`, sobe postgres + app, aguarda `/api/health`,
cria o admin inicial (`ADMIN_*`, só se não houver usuários) e sobe os workers.

## 3. Nginx (proxy reverso, no servidor)

```nginx
server {
  listen 80;
  server_name sgoa.sua-universidade.edu.br;
  client_max_body_size 50m;   # uploads (MAX_UPLOAD_SIZE)

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

O Cloudflared Tunnel aponta para o nginx (ou direto para `127.0.0.1:3000`),
conforme o padrão já usado na universidade. HTTPS termina no nginx/tunnel.

## 4. Operação

| Tarefa | Comando |
| :----- | :------ |
| Ver saúde | `curl http://127.0.0.1:3000/api/health` |
| Logs | `docker compose -f docker-compose.prod.yml logs -f app` |
| Atualizar versão | `SGOA_IMAGE=ghcr.io/ldsampaio/sgoa:vX.Y.Z ./deploy.sh` |
| Backup | `./backup.sh` (gera `backups/sgoa-db-*` + `sgoa-uploads-*`) |
| Restore | `./restore.sh <db.sql.gz> <uploads.tar.gz>` |
| Admin inicial | via `ADMIN_*` no deploy; depois, gerenciar pela UI |

Agende `./backup.sh` no cron (ex: diário) e copie `backups/` para fora do servidor.

## 5. Notas

- **1 réplica da API**: sessões são stateless (JWT), mas uploads e o SQLite
  legado são locais — não escale `app` além de 1 sem migrar uploads p/ S3/NFS.
- **Seed bloqueado em produção** (`NODE_ENV=production`); bootstrap só via admin.
- **Branches**: `develop` (dia a dia) → PR → `main` (protegida) → tag `vX.Y.Z` →
  imagem publicada no GHCR. Release ritual detalhado no README.
