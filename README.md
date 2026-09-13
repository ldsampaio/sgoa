# SGOA — Desenvolvimento (MVP)

Implementação de desenvolvimento do **Sistema de Gerenciamento de Orientações Acadêmicas (SGOA)**, criada a partir dos documentos em `../projeto/` (visão e escopo, requisitos funcionais e não funcionais, modelagem de dados e wireframes).

## Estrutura

```
dev/
├── backend/    API REST (Node.js + Express + SQLite)
└── frontend/   Aplicação web SPA (Vue 3 + Vite) com arquitetura MVC
```

## Tecnologias

| Camada | Tecnologia | Observações |
| :----- | :--------- | :---------- |
| Backend  | Node.js (≥ 22.5), Express 5 | Usa `node:sqlite` (SQLite nativo, sem dependências binárias) |
| Banco    | SQLite (arquivo `backend/data/sgoa.sqlite`) | Schema segue a modelagem de dados; pronto para migrar a PostgreSQL/MySQL |
| Auth     | JWT + `crypto.scrypt` | Senhas com salt, segundo NFR.SEG.004 |
| Frontend | Vue 3 + Vue Router + Vite | SPA com padrão MVC |

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

| Perfil | E-mail | Senha |
| :----- | :----- | :---- |
| Administrador | admin@sgoa.dev | Admin@123 |
| Professor | carlos@sgoa.dev | Prof@1234 |
| Coordenadora | silvia@sgoa.dev | Coord@1234 |
| Aluna | ana@sgoa.dev | Aluno@1234 |
| Aluno | joao@sgoa.dev | Aluno@1234 |

## Arquitetura

### Backend — MVC por camadas

```
src/
├── config/        Inicialização do banco (schema SQL) e conexão
├── models/        Acesso a dados (consultas por entidade)
├── controllers/   HTTP handlers (recebem/sanitizam entrada, delegam aos models)
├── routes/        Rotas Express por recurso
├── services/      Regras de negócio transversais (acesso, notificações)
├── middleware/    Autenticação (JWT), autorização (RBAC), tratamento de erros
├── utils/         Hash de senha, token, helpers de query
└── seeders/       Seed de dados de demonstração
```

Entidades implementadas conforme `modelagem-de-dados.md`: `usuarios`, `perfis`, `professores`, `alunos`, `orientacoes`, `co_orientadores`, `reunioes`, `tarefas`, `documentos` (com versionamento), `mensagens` e `notificacoes`.

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
| Gestão de usuários | Cadastro (admin), login, edição de perfil | ✅ RF.GU.001-005 |
| Gestão de orientações | Criar, listar por papel, adicionar/remover co-orientador, alterar status | ✅ RF.GO.001-005 |
| Acompanhamento | Registro de reuniões, tarefas com prazo, marcar concluída, linha do tempo | ✅ RF.AP.001-005 |
| Comunicação | Mensagens por orientação + notificações (tarefa, prazo, mensagem, documento) | ✅ RF.CO.001-003 |
| Documentos | Upload, download, histórico de versões (v1, v2, ...) | ✅ RF.GD.001-004 |
| Dashboards | Professor, aluno e coordenador (visão geral, prazos críticos, carga) | ✅ RF.VI.001-003 |

Segurança: autenticação JWT obrigatória (NFR.SEG.001), RBAC por papel (NFR.SEG.002), hash de senha com salt (NFR.SEG.004), validação de complexidade de senha (NFR.SEG.007), uso de queries parametrizadas (NFR.SEG.006).

## API — endpoints principais

```
POST /api/auth/login               Login (email + senha)
GET  /api/auth/me                  Perfil do usuário autenticado
POST /api/usuarios                 (admin) Criar usuário
GET  /api/usuarios                 (coord/admin) Listar usuários
PUT  /api/usuarios/me              Atualizar próprio perfil
GET  /api/usuarios/professores     Listar professores (para seleção)
GET  /api/usuarios/alunos          Listar alunos (para seleção)
GET|POST /api/orientacoes          Listar/Criar orientações (filtro por papel)
GET|PUT  /api/orientacoes/:id      Detalhes/Atualizar orientação
POST /api/orientacoes/:id/coorientadores          Adicionar co-orientador
DELETE /api/orientacoes/:id/coorientadores/:prof  Remover co-orientador
GET|POST /api/orientacoes/:id/tarefas             Listar/Criar tarefas
PUT  /api/tarefas/:id              Atualizar status da tarefa
GET|POST /api/orientacoes/:id/reunioes            Listar/Criar reuniões
GET|POST /api/orientacoes/:id/documentos          Listar/Enviar documentos
GET  /api/documentos/:id/download  Baixar documento
GET|POST /api/orientacoes/:id/mensagens          Listar/Enviar mensagens
GET  /api/orientacoes/:id/atividades             Linha do tempo / feed
GET  /api/notificacoes             Notificações do usuário
PUT  /api/notificacoes/:id/lida    Marcar como lida
GET  /api/dashboard/:papel         Dashboard por papel
```

## Notas

- O banco é recriado/limpo a cada `npm run seed`; arquivos enviados vão para `backend/uploads/`.
- **Produção**: substituir o SQLite por PostgreSQL/MySQL mantendo o schema, trocar `JWT_SECRET` por valor forte, usar HTTPS (NFR.SEG.003) e ajustar `CORS_ORIGIN`/`MAX_UPLOAD_SIZE`.
- Frontend em produção: `npm run build` gera `frontend/dist/` para servir via Nginx/CDN (SPA history mode exige configuração de fallback para `index.html`).