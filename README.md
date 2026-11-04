# SGOA — Desenvolvimento (MVP)

Implementação de desenvolvimento do **Sistema de Gerenciamento de Orientações Acadêmicas (SGOA)**, criada a partir dos documentos em `../projeto/` (visão e escopo, requisitos funcionais e não funcionais, modelagem de dados e wireframes).

> **Superado pelos documentos de `projeto/`:** os requisitos de credencial (login por senha,
> recuperação de senha, políticas de complexidade, `senha_hash` na modelagem de dados) não
> valem mais para o sgoa. Desde a identidade unificada o sgoa **não autentica credencial** —
> ele verifica a sessão compartilhada do saga. Ver §Sessão e identidade e
> `../docs/session-contract.md`. O que permanece dos documentos originais é o domínio
> (orientações, prazos, avaliação) e o RBAC por papel em `sgoa.perfis`.

## Estrutura

```
dev/
├── backend/    API REST (Node.js + Express + Postgres)
└── frontend/   Aplicação web SPA (Vue 3 + Vite) com arquitetura MVC
```

## Tecnologias

| Camada | Tecnologia | Observações |
| :----- | :--------- | :---------- |
| Backend  | Node.js (≥ 22.5), Express 5 | Único driver: Postgres |
| Banco    | Postgres compartilhado, schema `sgoa` | `auth.*` é do saga: o sgoa só lê, nunca migra tabela em `auth` |
| Auth     | Sessão compartilhada do saga (cookie `saga_session` + JWT-ponteiro `ES256`) | O sgoa não autentica credencial e não guarda senha — verifica liveness no Redis |
| Frontend | Vue 3 + Vue Router + Vite | SPA com padrão MVC, cookie-based (`credentials: 'include'`) |

## Como rodar

### 1. Backend (porta 3000)

```bash
cd dev/backend
npm install
cp .env.example .env            # opcional
npm run seed                    # popula dados de demonstração
npm start                       # ou: npm run dev (reload automático)
```

### 2. Frontend (porta 5173)

```bash
cd dev/frontend
npm install
cp .env.example .env            # opcional (o proxy /api já cobre em dev)
npm run dev
```

Acesse `http://localhost:5173`.

### Acessos de demonstração (seed)

Não há senha: o cadastro e a autenticação são do saga. Em dev o seed registra a
identidade em `auth.users` / `auth.user_profiles` (exceção de dev, travada em produção)
e o papel no sgoa (`sgoa.perfis`). Entre no portal do saga com um destes logins e o
sgoa reconhece a sessão sem novo login.

| Perfil | Login | Papel no sgoa |
| :----- | :---- | :------------ |
| Administrador | `adm001` | Administrador |
| Professor | `p1001` | Professor |
| Coordenadora | `c1001` | Coordenador |
| Aluna | `a234562` | Aluno |
| Aluno | `a234561` | Aluno |

## Sessão e identidade (contrato compartilhado)

Autoridade: `../docs/session-contract.md`. Resumo do que vale para o sgoa:

- O sgoa **não autentica credencial**. Sem sessão, o frontend redireciona para o saga.
- O middleware lê `saga:heartbeat` e `saga:sess:{sid}:meta` no Redis. Sem heartbeat
  → **503** (`IDENTITY_UNAVAILABLE`), sem fallback, mesmo com token válido e JWKS
  cacheado. 401 e 503 são caminhos distintos no frontend.
- `req.user` vem do Redis. O papel por sistema vem de `sgoa.perfis`, nunca do claim
  `role` do JWT.
- O `sid` do token é opaco e tem charset restrito (`^[A-Za-z0-9_-]{8,64}$`): o verifier nunca
  monta o nome de chave Redis a partir do conteúdo do token. Fora do charset → `BAD_TOKEN`.
- **Regra de propriedade de schema:** o sgoa é dono de `sgoa.*`. O schema `auth` é do
  saga — o sgoa nunca cria nem altera tabela em `auth`. Em runtime o sgoa só **lê** `auth`;
  a única escrita é o seed de demonstração (`src/seeders/seed.js`), que insere linhas e é
  travado em produção (`NODE_ENV=production` recusa). Em produção a identidade é criada
  pelo saga no primeiro login.
- O sgoa conecta no Redis pelo usuário ACL `saga_readonly`: lê só
  `saga:sess:*:meta` e `saga:heartbeat`; não lê o payload upstream e não escreve.
- Só o saga renova `last_seen_at`. O sgoa só lê.

## Arquitetura

### Backend — MVC por camadas

```
src/
├── config/        Inicialização do banco (schema SQL) e conexão
├── models/        Acesso a dados (consultas por entidade)
├── controllers/   HTTP handlers (recebem/sanitizam entrada, delegam aos models)
├── routes/        Rotas Express por recurso
├── services/      Regras de negócio transversais (acesso, notificações)
├── middleware/    Verificação de sessão compartilhada, autorização (RBAC), tratamento de erros
├── utils/         Criptografia de segredos (AES-GCM), ids, helpers de query
└── seeders/       Seed de dados de demonstração
```

Entidades implementadas conforme `modelagem-de-dados.md`: `usuarios`, `perfis`, `professores`, `alunos`, `orientacoes`, `co_orientadores`, `reunioes`, `tarefas`, `documentos` (com versionamento), `mensagens`, `notificacoes` e `enlaces_overleaf` + `enlaces_destacados` (RF.OV, destaque por usuário).

### Frontend — MVC em SPA

```
src/
├── models/        Camada Model — cliente HTTP e acesso aos dados (api.js)
│                  + um model por recurso (Orientacao, Tarefa, Reuniao, ...)
├── controllers/   Camada Controller — estado reativo + orquestração
│                  (Auth, Dashboard, Orientacao, Tarefa, Reuniao,
│                   Documento, Mensagem, Notificacao, Usuarios)
├── views/         Camada View — componentes Vue (telas + componentes de UI)
└── router/        Roteador SPA + guardas de autenticação/RBAC
```

Fluxo típico: **View** (template) → dispara ação do **Controller** → **Controller** usa o **Model** (fetch à API) → atualiza o estado reativo → a **View** re-renderiza.

## Funcionalidades implementadas (mapeadas aos requisitos)

| Módulo | Requisito | Status |
| :----- | :--------- | :----- |
| Gestão de usuários | Edição de perfil e de papel por sistema (não há cadastro nem login — são do saga) | ✅ RF.GU.001-005 |
| Gestão de orientações | Criar, listar por papel, adicionar/remover co-orientador, alterar status | ✅ RF.GO.001-005 |
| Acompanhamento | Registro de reuniões, tarefas com prazo, marcar concluída, linha do tempo | ✅ RF.AP.001-005 |
| Quadro Kanban | Colunas A fazer/Fazendo/Feito, drag and drop, título, descrição, prioridade, cores, edição e arquivamento | ✅ RF.AP.006-007 |
| Comunicação | Mensagens por orientação + notificações (tarefa, prazo, mensagem, documento) | ✅ RF.CO.001-003 |
| Documentos | Upload, download, histórico de versões (v1, v2, ...) | ✅ RF.GD.001-004 |
| Enlaces Overleaf | Aluno registra o link do projeto institucional com o tipo de documento; destaque por usuário; notificação | ✅ RF.OV.001-006 |
| Dashboards | Professor, aluno e coordenador (visão geral, prazos críticos, carga) | ✅ RF.VI.001-003 |

Segurança: sessão verificada contra o Redis do saga (NFR.SEG.001), RBAC por papel na tabela `sgoa.perfis` (NFR.SEG.002), **nenhuma credencial armazenada ou aceita** (T10 — nenhuma rota recebe campo `senha`/`password`, nenhuma coluna de senha existe no schema), queries parametrizadas (NFR.SEG.006). Sem `saga:heartbeat` no Redis o sgoa rejeita com 503 e serve página de erro própria — sem redirecionar para o serviço que caiu.

## API — endpoints principais

```
GET  /api/auth/me                  Identidade da sessão compartilhada (401 ou 503)
GET  /api/usuarios                 (coord/admin) Listar usuários (lê `auth.users`)
PUT  /api/usuarios/me              Atualizar próprio perfil
PUT  /api/usuarios/:id             (coord/admin) Atualizar usuário
GET  /api/usuarios/professores     Listar professores (para seleção)
GET  /api/usuarios/alunos          Listar alunos (para seleção)
GET|POST /api/orientacoes          Listar/Criar orientações (filtro por papel)
GET|PUT  /api/orientacoes/:id      Detalhes/Atualizar orientação
POST /api/orientacoes/:id/coorientadores          Adicionar co-orientador
DELETE /api/orientacoes/:id/coorientadores/:prof  Remover co-orientador
GET|POST /api/orientacoes/:id/tarefas             Listar/Criar tarefas
PUT  /api/tarefas/:id              Atualizar cartão (título, descrição, prioridade, cor, status, ordem, responsável, prazo)
DELETE /api/tarefas/:id            Arquivar cartão (soft delete; criador ou gestão)
GET|POST /api/orientacoes/:id/reunioes            Listar/Criar reuniões
GET|POST /api/orientacoes/:id/documentos          Listar/Enviar documentos
GET  /api/documentos/:id/download  Baixar documento
GET|POST /api/orientacoes/:id/enlaces            Listar/Registrar links Overleaf (RF.OV)
GET      /api/enlaces/me                         Links do usuário (todas suas orientações)
GET      /api/enlaces/categorias                 Tipos de documento do enlace
PUT|DELETE /api/enlaces/:id                      Atualizar/Remover enlace
PATCH    /api/enlaces/:id/destacar               Fixar/desfixar para o usuário que chama
GET|POST /api/orientacoes/:id/mensagens          Listar/Enviar mensagens
GET  /api/orientacoes/:id/atividades             Linha do tempo / feed
GET  /api/notificacoes             Notificações do usuário
PUT  /api/notificacoes/:id/lida    Marcar como lida
GET  /api/dashboard/:papel         Dashboard por papel
```

Não há `POST /api/usuarios` nem rota de login: o sgoa não cria identidade nem aceita
credencial. O papel por sistema (`sgoa.perfis`) é atribuído pelo seed de dev ou pela UI de
admin; a identidade nasce no primeiro login do saga. A página de erro própria
(`/indisponivel`) é rota do **frontend**, não da API.

## Notas

- O banco de dev é recriado/limpo a cada `npm run seed` (travado em produção); arquivos enviados vão para `backend/uploads/`.
- **Kanban**: cartões arquivados saem do quadro, da lista e dos dashboards, mas permanecem no banco e na linha do tempo (rótulo “Arquivada”).
- **Banco de dados**: Postgres é o único driver, em dev e em produção (`DATABASE_URL`) — a
  dualidade SQLite/Postgres acabou. O schema `sgoa` é criado pelo próprio sgoa no boot
  (`src/config/database.js`); o schema `auth` é do saga (`saga/db/schema.sql`).
- **Produção**: ver `deploy/README.md` (container único + Postgres + Kafka, nginx +
  Cloudflared no servidor). O que precisa ser seguro aqui é o acesso ao Redis compartilhado
  (usuário ACL `saga_readonly`) e o JWKS do saga — o sgoa não assina token de sessão. O boot de
  produção recusa ambiente inseguro (`src/config/gateProducao.js`, SEC-02 — mesma forma do gate
  do sgrf): `REDIS_URL` fora da ACL, `SAGA_JWKS_URL`, `SAGA_LOGIN_URL` ou a allowlist de
  redirect vazios ou com placeholder. `JWT_SECRET` segue obrigatória só para o state anti-CSRF
  da integração Google (`src/services/googleCalendar.service.js`). Ajustar
  `CORS_ORIGIN`/`MAX_UPLOAD_SIZE`.

## Branches e releases

- `develop`: trabalho do dia a dia (ou `feat/*` → PR para `develop`).
- `main`: estável/produção, **protegida** (só entra via PR, sem push direto nem force-push).
- Ritual de release: PR `develop` → `main` → merge → `git tag vX.Y.Z` → `gh release create vX.Y.Z` → workflow publica `ghcr.io/ldsampaio/sgoa:vX.Y.Z` (+ `:latest`).