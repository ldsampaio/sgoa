import 'dotenv/config';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROMPTS_PADRAO, TIPOS_DOCUMENTO_BASE } from '../services/promptsPadrao.js';

// Driver selecionado por env:
//   DB_DRIVER=postgres (ou DATABASE_URL definido) → Postgres (produção).
//   padrão → SQLite local (desenvolvimento, zero fricção).
const DRIVER = String(
  process.env.DB_DRIVER || (process.env.DATABASE_URL ? 'postgres' : 'sqlite'),
).toLowerCase();

export const isPostgres = () => DRIVER === 'postgres';

const __dirname = dirname(fileURLToPath(import.meta.url));

let sqliteDb = null;
let pgPool = null;

if (!isPostgres()) {
  const rawPath = process.env.DB_PATH || './data/sgoa.sqlite';
  if (rawPath === ':memory:') {
    sqliteDb = new DatabaseSync(':memory:');
  } else {
    const dbPath = resolve(rawPath);
    mkdirSync(dirname(dbPath), { recursive: true });
    sqliteDb = new DatabaseSync(dbPath);
  }
  sqliteDb.exec('PRAGMA foreign_keys = ON;');
  sqliteDb.exec('PRAGMA journal_mode = WAL;');
  // API, worker de resultados e agente escrevem no mesmo arquivo: espera até 10s
  // por locks em vez de falhar com SQLITE_BUSY imediatamente.
  sqliteDb.exec('PRAGMA busy_timeout = 10000;');
}

// Acessores internos (usados por utils/query.js). Não importar pg no modo sqlite.
export function getSqlite() {
  if (!sqliteDb) throw new Error('Banco SQLite indisponível (driver postgres ativo).');
  return sqliteDb;
}

export async function getPool() {
  if (pgPool) return pgPool;
  const { default: pg } = await import('pg');
  pgPool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.PG_POOL_MAX) || 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  pgPool.on('error', (err) => console.error('[PG] erro no pool:', err.message));
  return pgPool;
}

// Executa um script com múltiplos statements (schema/seed). No Postgres,
// divide em statements individuais (node-postgres não retorna multi-result).
export async function execScript(sql) {
  if (!isPostgres()) {
    sqliteDb.exec(sql);
    return;
  }
  const pool = await getPool();
  for (const stmt of String(sql).split(';')) {
    const s = stmt.trim();
    if (s) await pool.query(s);
  }
}

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
  programa_pos  TEXT,
  data_matricula TEXT
);

-- Prazos regulatórios por nível (meses a partir da data de matrícula do aluno).
-- Editável pelo coordenador. NULL = sem prazo (TCC).
CREATE TABLE IF NOT EXISTS parametros_prazos (
  nivel                    TEXT PRIMARY KEY CHECK (nivel IN ('TCC', 'Mestrado', 'Doutorado')),
  prazo_conclusao_meses    INTEGER CHECK (prazo_conclusao_meses IS NULL OR prazo_conclusao_meses >= 0),
  prazo_qualificacao_meses INTEGER CHECK (prazo_qualificacao_meses IS NULL OR prazo_qualificacao_meses >= 0),
  data_atualizacao         TEXT
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
  qualificacao_concluida_em TEXT,
  defesa_concluida_em  TEXT,
  origem_marcacao      TEXT NOT NULL DEFAULT 'manual' CHECK (origem_marcacao IN ('manual', 'rpa')),
  data_cadastro        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  data_atualizacao     TEXT
);

-- Config de avisos por orientação (professor define dias de antecedência e frequência).
CREATE TABLE IF NOT EXISTS config_avisos_orientacao (
  id_orientacao             TEXT PRIMARY KEY REFERENCES orientacoes(id_orientacao) ON DELETE CASCADE,
  dias_antes_qualificacao   INTEGER NOT NULL DEFAULT 30 CHECK (dias_antes_qualificacao >= 0),
  dias_antes_defesa         INTEGER NOT NULL DEFAULT 30 CHECK (dias_antes_defesa >= 0),
  frequencia                TEXT NOT NULL DEFAULT 'semanal' CHECK (frequencia IN ('diaria', 'semanal', 'mensal')),
  data_atualizacao          TEXT
);

-- Log de avisos enviados (idempotência + cálculo da frequência).
CREATE TABLE IF NOT EXISTS lembretes_enviados (
  id_lembrete   TEXT PRIMARY KEY,
  id_orientacao TEXT NOT NULL REFERENCES orientacoes(id_orientacao) ON DELETE CASCADE,
  etapa         TEXT NOT NULL CHECK (etapa IN ('qualificacao', 'defesa')),
  data_envio    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_lembretes_orientacao_etapa ON lembretes_enviados(id_orientacao, etapa);

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

-- Credenciais SMTP por usuário (removido: conta única do projeto via env).
-- Migração: apaga a tabela legada se existir.
DROP TABLE IF EXISTS email_integracoes;

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
  id_tipo_documento      TEXT REFERENCES tipos_documento(id_tipo),
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

-- Códigos de recuperação de senha (RF.GU.003).
-- Código de 6 dígitos, hash com salt (nunca em texto puro), expiração curta,
-- tentativas limitadas e uso único. Novo pedido invalida os anteriores.
CREATE TABLE IF NOT EXISTS recuperacoes_senha (
  id              TEXT PRIMARY KEY,
  id_usuario      TEXT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  codigo_hash     TEXT NOT NULL,
  expira_em       TEXT NOT NULL,
  tentativas      INTEGER NOT NULL DEFAULT 0,
  usado_em        TEXT,
  criado_em       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS prompts_avaliacao (
  id_prompt        TEXT PRIMARY KEY,
  id_professor     TEXT NOT NULL REFERENCES professores(id_professor) ON DELETE CASCADE,
  id_tipo          TEXT NOT NULL REFERENCES tipos_documento(id_tipo),
  prompt           TEXT NOT NULL,
  data_atualizacao TEXT,
  UNIQUE (id_professor, id_tipo)
);

CREATE TABLE IF NOT EXISTS tipos_documento (
  id_tipo          TEXT PRIMARY KEY,
  nome             TEXT NOT NULL UNIQUE,
  descricao        TEXT,
  prompt_padrao    TEXT NOT NULL,
  ativo            INTEGER NOT NULL DEFAULT 1,
  data_criacao     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS avaliacoes (
  id_avaliacao     TEXT PRIMARY KEY,
  id_documento     TEXT NOT NULL UNIQUE REFERENCES documentos(id_documento) ON DELETE CASCADE,
  id_orientacao    TEXT NOT NULL REFERENCES orientacoes(id_orientacao) ON DELETE CASCADE,
  id_professor     TEXT NOT NULL REFERENCES professores(id_professor),
  id_tipo          TEXT REFERENCES tipos_documento(id_tipo),
  tipo             TEXT NOT NULL,
  prompt_usado     TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pendente'
                   CHECK (status IN ('pendente', 'processando', 'concluída', 'falha')),
  resultado        TEXT,
  nota             TEXT,
  erro             TEXT,
  tentativas       INTEGER NOT NULL DEFAULT 1,
  data_criacao     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  data_atualizacao TEXT
);

CREATE INDEX IF NOT EXISTS idx_tarefas_orientacao ON tarefas(id_orientacao);
CREATE INDEX IF NOT EXISTS idx_tarefas_responsavel ON tarefas(id_responsavel);
CREATE INDEX IF NOT EXISTS idx_reunioes_orientacao ON reunioes(id_orientacao);
CREATE INDEX IF NOT EXISTS idx_documentos_orientacao ON documentos(id_orientacao);
CREATE INDEX IF NOT EXISTS idx_mensagens_orientacao ON mensagens(id_orientacao);
CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario ON notificacoes(id_usuario);
CREATE INDEX IF NOT EXISTS idx_orientacoes_orientador ON orientacoes(id_orientador);
CREATE INDEX IF NOT EXISTS idx_orientacoes_aluno ON orientacoes(id_aluno);
CREATE INDEX IF NOT EXISTS idx_recuperacao_usuario ON recuperacoes_senha(id_usuario);
`;

// Schema canônico para Postgres (banco novo em produção): mesmo modelo de dados,
// com todas as colunas já incluídas (sem migrações incrementais) e defaults
// equivalentes. Datas seguem TEXT ISO-8601 e flags seguem INTEGER, como no SQLite.
const PG_NOW = `to_char((now() AT TIME ZONE 'UTC'), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;

export const SCHEMA_PG = `
CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario        TEXT PRIMARY KEY,
  nome              TEXT NOT NULL,
  email             TEXT NOT NULL UNIQUE,
  senha_hash        TEXT NOT NULL,
  tipo_usuario      TEXT NOT NULL CHECK (tipo_usuario IN ('Professor', 'Aluno', 'Coordenador', 'Administrador')),
  ativo             INTEGER NOT NULL DEFAULT 1,
  data_cadastro     TEXT NOT NULL DEFAULT (${PG_NOW}),
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
  programa_pos  TEXT,
  data_matricula TEXT
);

CREATE TABLE IF NOT EXISTS parametros_prazos (
  nivel                    TEXT PRIMARY KEY CHECK (nivel IN ('TCC', 'Mestrado', 'Doutorado')),
  prazo_conclusao_meses    INTEGER CHECK (prazo_conclusao_meses IS NULL OR prazo_conclusao_meses >= 0),
  prazo_qualificacao_meses INTEGER CHECK (prazo_qualificacao_meses IS NULL OR prazo_qualificacao_meses >= 0),
  data_atualizacao         TEXT
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
  qualificacao_concluida_em TEXT,
  defesa_concluida_em  TEXT,
  origem_marcacao      TEXT NOT NULL DEFAULT 'manual' CHECK (origem_marcacao IN ('manual', 'rpa')),
  data_cadastro        TEXT NOT NULL DEFAULT (${PG_NOW}),
  data_atualizacao     TEXT
);

CREATE TABLE IF NOT EXISTS config_avisos_orientacao (
  id_orientacao             TEXT PRIMARY KEY REFERENCES orientacoes(id_orientacao) ON DELETE CASCADE,
  dias_antes_qualificacao   INTEGER NOT NULL DEFAULT 30 CHECK (dias_antes_qualificacao >= 0),
  dias_antes_defesa         INTEGER NOT NULL DEFAULT 30 CHECK (dias_antes_defesa >= 0),
  frequencia                TEXT NOT NULL DEFAULT 'semanal' CHECK (frequencia IN ('diaria', 'semanal', 'mensal')),
  data_atualizacao          TEXT
);

CREATE TABLE IF NOT EXISTS lembretes_enviados (
  id_lembrete   TEXT PRIMARY KEY,
  id_orientacao TEXT NOT NULL REFERENCES orientacoes(id_orientacao) ON DELETE CASCADE,
  etapa         TEXT NOT NULL CHECK (etapa IN ('qualificacao', 'defesa')),
  data_envio    TEXT NOT NULL DEFAULT (${PG_NOW})
);
CREATE INDEX IF NOT EXISTS idx_lembretes_orientacao_etapa ON lembretes_enviados(id_orientacao, etapa);

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
  data_cadastro           TEXT NOT NULL DEFAULT (${PG_NOW})
);

CREATE TABLE IF NOT EXISTS integracoes_google (
  id_usuario        TEXT PRIMARY KEY REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  email_google      TEXT NOT NULL,
  refresh_token_enc TEXT NOT NULL,
  access_token      TEXT,
  expira_em         TEXT,
  data_conexao      TEXT NOT NULL DEFAULT (${PG_NOW})
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
  data_cadastro    TEXT NOT NULL DEFAULT (${PG_NOW}),
  data_atualizacao TEXT
);

CREATE TABLE IF NOT EXISTS tipos_documento (
  id_tipo          TEXT PRIMARY KEY,
  nome             TEXT NOT NULL UNIQUE,
  descricao        TEXT,
  prompt_padrao    TEXT NOT NULL,
  ativo            INTEGER NOT NULL DEFAULT 1,
  data_criacao     TEXT NOT NULL DEFAULT (${PG_NOW})
);

CREATE TABLE IF NOT EXISTS documentos (
  id_documento           TEXT PRIMARY KEY,
  id_orientacao          TEXT NOT NULL REFERENCES orientacoes(id_orientacao) ON DELETE CASCADE,
  id_uploader            TEXT NOT NULL REFERENCES usuarios(id_usuario),
  id_tipo_documento      TEXT REFERENCES tipos_documento(id_tipo),
  nome_arquivo           TEXT NOT NULL,
  tipo_arquivo           TEXT,
  caminho_armazenamento  TEXT NOT NULL,
  descricao              TEXT,
  versao                 INTEGER NOT NULL DEFAULT 1,
  data_upload            TEXT NOT NULL DEFAULT (${PG_NOW})
);

CREATE TABLE IF NOT EXISTS mensagens (
  id_mensagem   TEXT PRIMARY KEY,
  id_orientacao TEXT NOT NULL REFERENCES orientacoes(id_orientacao) ON DELETE CASCADE,
  id_remetente  TEXT NOT NULL REFERENCES usuarios(id_usuario),
  conteudo      TEXT NOT NULL,
  data_envio    TEXT NOT NULL DEFAULT (${PG_NOW})
);

CREATE TABLE IF NOT EXISTS notificacoes (
  id_notificacao TEXT PRIMARY KEY,
  id_usuario     TEXT NOT NULL REFERENCES usuarios(id_usuario),
  tipo           TEXT NOT NULL,
  titulo         TEXT NOT NULL,
  mensagem       TEXT,
  lida           INTEGER NOT NULL DEFAULT 0,
  data_criacao   TEXT NOT NULL DEFAULT (${PG_NOW})
);

CREATE TABLE IF NOT EXISTS recuperacoes_senha (
  id              TEXT PRIMARY KEY,
  id_usuario      TEXT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  codigo_hash     TEXT NOT NULL,
  expira_em       TEXT NOT NULL,
  tentativas      INTEGER NOT NULL DEFAULT 0,
  usado_em        TEXT,
  criado_em       TEXT NOT NULL DEFAULT (${PG_NOW})
);

CREATE TABLE IF NOT EXISTS prompts_avaliacao (
  id_prompt        TEXT PRIMARY KEY,
  id_professor     TEXT NOT NULL REFERENCES professores(id_professor) ON DELETE CASCADE,
  id_tipo          TEXT NOT NULL REFERENCES tipos_documento(id_tipo),
  prompt           TEXT NOT NULL,
  data_atualizacao TEXT,
  UNIQUE (id_professor, id_tipo)
);

CREATE TABLE IF NOT EXISTS avaliacoes (
  id_avaliacao     TEXT PRIMARY KEY,
  id_documento     TEXT NOT NULL UNIQUE REFERENCES documentos(id_documento) ON DELETE CASCADE,
  id_orientacao    TEXT NOT NULL REFERENCES orientacoes(id_orientacao) ON DELETE CASCADE,
  id_professor     TEXT NOT NULL REFERENCES professores(id_professor),
  id_tipo          TEXT REFERENCES tipos_documento(id_tipo),
  tipo             TEXT NOT NULL,
  prompt_usado     TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pendente'
                   CHECK (status IN ('pendente', 'processando', 'concluída', 'falha')),
  resultado        TEXT,
  nota             TEXT,
  erro             TEXT,
  tentativas       INTEGER NOT NULL DEFAULT 1,
  data_criacao     TEXT NOT NULL DEFAULT (${PG_NOW}),
  data_atualizacao TEXT
);

CREATE INDEX IF NOT EXISTS idx_tarefas_orientacao ON tarefas(id_orientacao);
CREATE INDEX IF NOT EXISTS idx_tarefas_responsavel ON tarefas(id_responsavel);
CREATE INDEX IF NOT EXISTS idx_reunioes_orientacao ON reunioes(id_orientacao);
CREATE INDEX IF NOT EXISTS idx_documentos_orientacao ON documentos(id_orientacao);
CREATE INDEX IF NOT EXISTS idx_mensagens_orientacao ON mensagens(id_orientacao);
CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario ON notificacoes(id_usuario);
CREATE INDEX IF NOT EXISTS idx_orientacoes_orientador ON orientacoes(id_orientador);
CREATE INDEX IF NOT EXISTS idx_orientacoes_aluno ON orientacoes(id_aluno);
CREATE INDEX IF NOT EXISTS idx_recuperacao_usuario ON recuperacoes_senha(id_usuario);
CREATE INDEX IF NOT EXISTS idx_integracoes_email ON integracoes_google(email_google);
CREATE INDEX IF NOT EXISTS idx_reunioes_google_event ON reunioes(google_event_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_orientacao ON avaliacoes(id_orientacao);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_documento ON avaliacoes(id_documento);
CREATE INDEX IF NOT EXISTS idx_prompts_professor ON prompts_avaliacao(id_professor);
`;

export async function initDatabase() {
  if (isPostgres()) {
    await execScript(SCHEMA_PG);
    // parametros_prazos: garante as 3 linhas (nunca sobrescreve edição do coordenador).
    await execScript(`INSERT INTO parametros_prazos (nivel, prazo_conclusao_meses, prazo_qualificacao_meses)
      VALUES ('TCC', NULL, NULL), ('Mestrado', 24, 14), ('Doutorado', 48, 24)
      ON CONFLICT (nivel) DO NOTHING`);
    await migrarTiposDocumentoPg();
    return;
  }
  sqliteDb.exec(SCHEMA);
  // Migração idempotente para bancos criados antes das colunas Google/link.
  // (Os índices novos ficam aqui — criá-los no SCHEMA quebraria bancos antigos,
  // pois CREATE INDEX falha quando a coluna ainda não existe.)
  const colunas = sqliteDb.prepare('PRAGMA table_info(reunioes)').all().map((c) => c.name);
  if (!colunas.includes('link')) sqliteDb.exec('ALTER TABLE reunioes ADD COLUMN link TEXT');
  if (!colunas.includes('google_event_id')) sqliteDb.exec('ALTER TABLE reunioes ADD COLUMN google_event_id TEXT');
  sqliteDb.exec('CREATE INDEX IF NOT EXISTS idx_integracoes_email ON integracoes_google(email_google)');
  sqliteDb.exec('CREATE INDEX IF NOT EXISTS idx_reunioes_google_event ON reunioes(google_event_id)');
  sqliteDb.exec('CREATE INDEX IF NOT EXISTS idx_avaliacoes_orientacao ON avaliacoes(id_orientacao)');
  sqliteDb.exec('CREATE INDEX IF NOT EXISTS idx_avaliacoes_documento ON avaliacoes(id_documento)');
  sqliteDb.exec('CREATE INDEX IF NOT EXISTS idx_prompts_professor ON prompts_avaliacao(id_professor)');
  sqliteDb.exec('CREATE INDEX IF NOT EXISTS idx_recuperacao_usuario ON recuperacoes_senha(id_usuario)');

  // alunos: data de matrícula (YYYY-MM-DD, vinda do sistema acadêmico; manual por ora).
  if (!colunasDe('alunos').includes('data_matricula')) {
    sqliteDb.exec('ALTER TABLE alunos ADD COLUMN data_matricula TEXT');
  }

  // orientacoes: conclusão de etapas (marcada pelo orientador; RPA futuramente).
  const oriCols = colunasDe('orientacoes');
  if (!oriCols.includes('qualificacao_concluida_em')) sqliteDb.exec('ALTER TABLE orientacoes ADD COLUMN qualificacao_concluida_em TEXT');
  if (!oriCols.includes('defesa_concluida_em')) sqliteDb.exec('ALTER TABLE orientacoes ADD COLUMN defesa_concluida_em TEXT');
  if (!oriCols.includes('origem_marcacao')) sqliteDb.exec("ALTER TABLE orientacoes ADD COLUMN origem_marcacao TEXT NOT NULL DEFAULT 'manual'");

  // parametros_prazos: garante as 3 linhas (nunca sobrescreve edição do coordenador).
  sqliteDb.exec(`INSERT OR IGNORE INTO parametros_prazos (nivel, prazo_conclusao_meses, prazo_qualificacao_meses)
    VALUES ('TCC', NULL, NULL), ('Mestrado', 24, 14), ('Doutorado', 48, 24)`);

  await migrarTiposDocumento();
}

function colunasDe(tabela) {
  return sqliteDb.prepare(`PRAGMA table_info(${tabela})`).all().map((c) => c.name);
}

// Insere os tipos base que faltarem (nunca altera os existentes nem os criados
// por coordenadores). Chamado no boot; o seed recria o banco do zero via SCHEMA.
export async function ensureTiposBase() {
  const { all, run } = await import('../utils/query.js');
  const existentes = new Set((await all('SELECT nome FROM tipos_documento')).map((r) => r.nome));
  for (const t of TIPOS_DOCUMENTO_BASE) {
    if (!existentes.has(t.nome)) {
      await run('INSERT INTO tipos_documento (id_tipo, nome, descricao, prompt_padrao) VALUES (?, ?, ?, ?)', [
        randomUUID(),
        t.nome,
        t.descricao || null,
        PROMPTS_PADRAO[t.nome],
      ]);
    }
  }
}

// Categorias avaliáveis no Postgres novo: só garante os tipos base.
async function migrarTiposDocumentoPg() {
  await ensureTiposBase();
}

// Categorias avaliáveis: garante a tabela e os tipos base (idempotente).
// Coordenadores podem criar novos via API; o padrão deles fica só no banco.
async function migrarTiposDocumento() {
  await ensureTiposBase();

  // prompts_avaliacao legada: coluna `tipo` (enum) → `id_tipo` (FK). Rebuild com backfill.
  if (colunasDe('prompts_avaliacao').includes('tipo')) {
    sqliteDb.exec(`
      CREATE TABLE prompts_avaliacao_new (
        id_prompt        TEXT PRIMARY KEY,
        id_professor     TEXT NOT NULL REFERENCES professores(id_professor) ON DELETE CASCADE,
              id_tipo          TEXT NOT NULL REFERENCES tipos_documento(id_tipo),
        prompt           TEXT NOT NULL,
        data_atualizacao TEXT,
        UNIQUE (id_professor, id_tipo)
      );
      INSERT INTO prompts_avaliacao_new (id_prompt, id_professor, id_tipo, prompt, data_atualizacao)
        SELECT p.id_prompt, p.id_professor, t.id_tipo, p.prompt, p.data_atualizacao
        FROM prompts_avaliacao p JOIN tipos_documento t ON t.nome = p.tipo;
      DROP TABLE prompts_avaliacao;
      ALTER TABLE prompts_avaliacao_new RENAME TO prompts_avaliacao;
    `);
    sqliteDb.exec('CREATE INDEX IF NOT EXISTS idx_prompts_professor ON prompts_avaliacao(id_professor)');
  }

  // documentos: categoria do arquivo (nullable, sem rebuild).
  if (!colunasDe('documentos').includes('id_tipo_documento')) {
    sqliteDb.exec('ALTER TABLE documentos ADD COLUMN id_tipo_documento TEXT REFERENCES tipos_documento(id_tipo)');
  }

  // avaliacoes: adiciona id_tipo + remove o CHECK do enum (rebuild preservando dados).
  const avalCols = colunasDe('avaliacoes');
  const avalSql = sqliteDb.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'avaliacoes'").get()?.sql || '';
  if (!avalCols.includes('id_tipo')) {
    sqliteDb.exec('ALTER TABLE avaliacoes ADD COLUMN id_tipo TEXT REFERENCES tipos_documento(id_tipo)');
    sqliteDb.exec(`UPDATE avaliacoes SET id_tipo = (SELECT id_tipo FROM tipos_documento WHERE nome = avaliacoes.tipo)`);
  }
  if (avalSql.includes('CHECK (tipo')) {
    sqliteDb.exec(`
      CREATE TABLE avaliacoes_new (
        id_avaliacao     TEXT PRIMARY KEY,
        id_documento     TEXT NOT NULL UNIQUE REFERENCES documentos(id_documento) ON DELETE CASCADE,
        id_orientacao    TEXT NOT NULL REFERENCES orientacoes(id_orientacao) ON DELETE CASCADE,
        id_professor     TEXT NOT NULL REFERENCES professores(id_professor),
              id_tipo          TEXT REFERENCES tipos_documento(id_tipo),
        tipo             TEXT NOT NULL,
        prompt_usado     TEXT NOT NULL,
        status           TEXT NOT NULL DEFAULT 'pendente'
                         CHECK (status IN ('pendente', 'processando', 'concluída', 'falha')),
        resultado        TEXT,
        nota             TEXT,
        erro             TEXT,
        tentativas       INTEGER NOT NULL DEFAULT 1,
        data_criacao     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        data_atualizacao TEXT
      );
      INSERT INTO avaliacoes_new
        (id_avaliacao, id_documento, id_orientacao, id_professor, id_tipo, tipo, prompt_usado,
         status, resultado, nota, erro, tentativas, data_criacao, data_atualizacao)
        SELECT id_avaliacao, id_documento, id_orientacao, id_professor, id_tipo, tipo, prompt_usado,
         status, resultado, nota, erro, tentativas, data_criacao, data_atualizacao FROM avaliacoes;
      DROP TABLE avaliacoes;
      ALTER TABLE avaliacoes_new RENAME TO avaliacoes;
    `);
    sqliteDb.exec('CREATE INDEX IF NOT EXISTS idx_avaliacoes_orientacao ON avaliacoes(id_orientacao)');
    sqliteDb.exec('CREATE INDEX IF NOT EXISTS idx_avaliacoes_documento ON avaliacoes(id_documento)');
  }
}

export function now() {
  return new Date().toISOString();
}
