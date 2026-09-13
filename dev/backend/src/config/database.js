import 'dotenv/config';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = resolve(process.env.DB_PATH || './data/sgoa.sqlite');

if (dbPath !== ':memory:') {
  mkdirSync(dirname(dbPath), { recursive: true });
}

export const db = new DatabaseSync(dbPath);

db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario        TEXT PRIMARY KEY,
  nome              TEXT NOT NULL,
  email             TEXT NOT NULL UNIQUE,
  senha_hash        TEXT NOT NULL,
  tipo_usuario      TEXT NOT NULL CHECK (tipo_usuario IN ('Professor', 'Aluno', 'Coordenador', 'Administrador')),
  ativo             INTEGER NOT NULL DEFAULT 1,
  data_cadastro     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  data_atualizacao  TEXT
);

CREATE TABLE IF NOT EXISTS perfis (
  id_perfil       TEXT PRIMARY KEY,
  id_usuario      TEXT NOT NULL REFERENCES usuarios(id_usuario),
  papel           TEXT NOT NULL,
  UNIQUE (id_usuario, papel)
);

CREATE TABLE IF NOT EXISTS professores (
  id_professor   TEXT PRIMARY KEY,
  id_usuario     TEXT NOT NULL UNIQUE REFERENCES usuarios(id_usuario),
  matricula      TEXT NOT NULL UNIQUE,
  departamento   TEXT
);

CREATE TABLE IF NOT EXISTS alunos (
  id_aluno      TEXT PRIMARY KEY,
  id_usuario    TEXT NOT NULL UNIQUE REFERENCES usuarios(id_usuario),
  matricula     TEXT NOT NULL UNIQUE,
  curso         TEXT NOT NULL,
  programa_pos  TEXT
);

CREATE TABLE IF NOT EXISTS orientacoes (
  id_orientacao        TEXT PRIMARY KEY,
  id_orientador        TEXT NOT NULL REFERENCES professores(id_professor),
  id_aluno             TEXT NOT NULL REFERENCES alunos(id_aluno),
  tipo                 TEXT NOT NULL CHECK (tipo IN ('TCC', 'Mestrado', 'Doutorado')),
  titulo_provisorio    TEXT,
  status               TEXT NOT NULL DEFAULT 'Em Andamento'
                       CHECK (status IN ('Em Andamento', 'Concluída', 'Suspensa', 'Cancelada')),
  data_inicio          TEXT,
  data_previsao_fim    TEXT,
  data_cadastro        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  data_atualizacao     TEXT
);

CREATE TABLE IF NOT EXISTS co_orientadores (
  id_co_orientador  TEXT PRIMARY KEY,
  id_orientacao     TEXT NOT NULL REFERENCES orientacoes(id_orientacao) ON DELETE CASCADE,
  id_professor      TEXT NOT NULL REFERENCES professores(id_professor),
  UNIQUE (id_orientacao, id_professor)
);

CREATE TABLE IF NOT EXISTS reunioes (
  id_reuniao              TEXT PRIMARY KEY,
  id_orientacao           TEXT NOT NULL REFERENCES orientacoes(id_orientacao) ON DELETE CASCADE,
  data_hora               TEXT NOT NULL,
  pauta                   TEXT,
  decisoes_proximos_passos TEXT,
  participantes           TEXT,
  link                    TEXT,
  google_event_id         TEXT,
  data_cadastro           TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS integracoes_google (
  id_usuario        TEXT PRIMARY KEY REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  email_google      TEXT NOT NULL,
  refresh_token_enc TEXT NOT NULL,
  access_token      TEXT,
  expira_em         TEXT,
  data_conexao      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS tarefas (
  id_tarefa        TEXT PRIMARY KEY,
  id_orientacao    TEXT NOT NULL REFERENCES orientacoes(id_orientacao) ON DELETE CASCADE,
  id_responsavel   TEXT NOT NULL REFERENCES usuarios(id_usuario),
  descricao        TEXT NOT NULL,
  data_limite      TEXT,
  status           TEXT NOT NULL DEFAULT 'Pendente'
                   CHECK (status IN ('Pendente', 'Em Andamento', 'Concluída', 'Atrasada')),
  concluida_em     TEXT,
  data_cadastro    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  data_atualizacao TEXT
);

CREATE TABLE IF NOT EXISTS documentos (
  id_documento           TEXT PRIMARY KEY,
  id_orientacao          TEXT NOT NULL REFERENCES orientacoes(id_orientacao) ON DELETE CASCADE,
  id_uploader            TEXT NOT NULL REFERENCES usuarios(id_usuario),
  nome_arquivo           TEXT NOT NULL,
  tipo_arquivo           TEXT,
  caminho_armazenamento  TEXT NOT NULL,
  descricao              TEXT,
  versao                 INTEGER NOT NULL DEFAULT 1,
  data_upload            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS mensagens (
  id_mensagem   TEXT PRIMARY KEY,
  id_orientacao TEXT NOT NULL REFERENCES orientacoes(id_orientacao) ON DELETE CASCADE,
  id_remetente  TEXT NOT NULL REFERENCES usuarios(id_usuario),
  conteudo      TEXT NOT NULL,
  data_envio    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS notificacoes (
  id_notificacao TEXT PRIMARY KEY,
  id_usuario     TEXT NOT NULL REFERENCES usuarios(id_usuario),
  tipo           TEXT NOT NULL,
  titulo         TEXT NOT NULL,
  mensagem       TEXT,
  lida           INTEGER NOT NULL DEFAULT 0,
  data_criacao   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_tarefas_orientacao ON tarefas(id_orientacao);
CREATE INDEX IF NOT EXISTS idx_tarefas_responsavel ON tarefas(id_responsavel);
CREATE INDEX IF NOT EXISTS idx_reunioes_orientacao ON reunioes(id_orientacao);
CREATE INDEX IF NOT EXISTS idx_documentos_orientacao ON documentos(id_orientacao);
CREATE INDEX IF NOT EXISTS idx_mensagens_orientacao ON mensagens(id_orientacao);
CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario ON notificacoes(id_usuario);
CREATE INDEX IF NOT EXISTS idx_orientacoes_orientador ON orientacoes(id_orientador);
CREATE INDEX IF NOT EXISTS idx_orientacoes_aluno ON orientacoes(id_aluno);
`;

export function initDatabase() {
  db.exec(SCHEMA);
  // Migração idempotente para bancos criados antes das colunas Google/link.
  // (Os índices novos ficam aqui — criá-los no SCHEMA quebraria bancos antigos,
  // pois CREATE INDEX falha quando a coluna ainda não existe.)
  const colunas = db.prepare('PRAGMA table_info(reunioes)').all().map((c) => c.name);
  if (!colunas.includes('link')) db.exec('ALTER TABLE reunioes ADD COLUMN link TEXT');
  if (!colunas.includes('google_event_id')) db.exec('ALTER TABLE reunioes ADD COLUMN google_event_id TEXT');
  db.exec('CREATE INDEX IF NOT EXISTS idx_integracoes_email ON integracoes_google(email_google)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_reunioes_google_event ON reunioes(google_event_id)');
}

export function now() {
  return new Date().toISOString();
}