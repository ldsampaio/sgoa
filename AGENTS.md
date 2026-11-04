# AGENTS.md — SGOA

SPA MVC (Vue 3 + Vite) + API Node/Express sobre Postgres. Dois pacotes **sem workspace**
— rode comandos dentro de `dev/backend/` ou `dev/frontend/`.

## Dev rápido

```bash
cd dev/backend && cp .env.example .env && npm install && npm run seed   # schema sgoa + demonstração
npm run dev                       # API :3000
# outro shell: cd dev/frontend && npm install && npm run dev   # :5173
```

Kafka e workers só quando a avaliação IA entra em jogo (`dev/docker-compose.yml`).

## Testes / verificação

- Backend: `cd dev/backend && npm test` (`node --test`; suítes `contratoSessao`, `sessao`,
  `enlaceUrl`, `gateProducao`) e `npm run smoke` (ponta a ponta contra Postgres).
- Frontend **não tem testes** — verifique com `cd dev/frontend && npm run build`.
- CI (`ci.yml`) roda o smoke + `npm test` contra Postgres e o build do frontend. A perna
  SQLite foi removida: Postgres é o único driver.

## Armadilhas verificadas

- **node-redis v6 expõe `hGetAll` (camelCase)** — `hgetall` não existe no cliente real.
  `src/config/redis.js` mantém o nome que o verifier espera e delega; chamar `hgetall` no
  cliente lança TypeError, que o verifier trata como "liveness não confirmada" e vira 503.
- **`getPool()` é async**: `await getPool().query(...)` falha; é
  `await (await getPool()).query(...)`.
- **Schema `sgoa` é criado no boot** por `src/config/database.js` (`initDatabase()`), não por
  migração. O schema `auth` é do **saga**: o sgoa nunca cria nem altera tabela de `auth`.
  Em runtime o sgoa só lê `auth`; a única escrita é o seed de dev (travado em
  `NODE_ENV=production`).
- **Redis é a fonte da verdade da sessão.** Sem `saga:heartbeat` o verifier responde **503**
  mesmo com JWT válido e JWKS cacheado — não há cache de sessão em processo nem fallback.
  O acesso ao Redis é pelo usuário ACL `saga_readonly` (`redis.acl` na raiz do projeto):
  só lê `saga:sess:*:meta` e `saga:heartbeat`, não lê o payload upstream e não escreve.
- **Credencial (T10):** `src/middleware/rejeitaCredencial.js` recusa campo de credencial em
  corpo de qualquer rota `/api`. Não há coluna de senha, nem rota de login/reset.
- **Papel por sistema** vive em `sgoa.perfis`; o claim `role` do JWT nunca é usado.
- **`sid` com charset inesperado → `BAD_TOKEN`** (contrato, passo 3): o verifier não monta
  nome de chave Redis a partir do conteúdo do token. Por isso os testes usam sids de 8+
  caracteres (`sid-0001`); um `sid` curto como `s1` agora é rejeitado.
- **Frontend:** nenhum token em `localStorage` — a sessão é o cookie compartilhado
  `saga_session` e o `fetch` sempre manda `credentials: 'include'`. `src/models/api.js` só
  informa (evento `sgoa:auth`); `src/plugins/decisaoErro.js` decide e `src/plugins/auth.js`
  executa — é o único ponto de navegação, então dois failures concorrentes produzem uma
  navegação. O guard do router bloqueia, não decide destino. 401 → `login_url` do corpo;
  503 → rota pública `/indisponivel`, **sem redirect**.
- **Gate de produção (SEC-02):** `src/config/gateProducao.js` recusa boot com `NODE_ENV=production`
  quando `REDIS_URL` (deve usar `saga_readonly`), `SAGA_JWKS_URL`, `SAGA_LOGIN_URL` ou
  `PORTAL_ALLOWED_REDIRECT_HOSTS` estão vazios, com `change-me` ou com prefixo `dev-`. Chamado
  em `server.js`; fora de produção não dispara. Mesma forma do gate do sgrf
  (`sgrf/backend/src/config/env.js`); regressão em `tests/gateProducao.test.js`. A mensagem
  nomeia só as variáveis — nenhum valor secreto aparece.
- **Rotas**: `src/app.js` monta `/api/*` com `authenticate` por rota; `GET /api/health`
  responde sem sessão.

## Docs

Autoridade da sessão: `../docs/session-contract.md`. README na raiz do sgoa; `IDEA.md` e
`CONTRATO-AGENTE-IA.md` descrevem a avaliação IA.
