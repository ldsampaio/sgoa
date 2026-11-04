import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { PROMPTS_PADRAO, TIPOS_DOCUMENTO_BASE } from '../services/promptsPadrao.js';
import { CATEGORIAS_ENLACE, ESTADOS_ENLACE, valoresDoCheck } from '../services/enlacesCategorias.js';

// Postgres é o único driver. Acabou a dualidade SQLite/Postgres.
//
// Propriedade de schema (regra de ouro): `auth` é do saga. O sgoa NUNCA cria nem
// altera tabela em `auth` — apenas lê. O sgoa é dono do schema `sgoa`.
export const SCHEMA_SGOA = 'sgoa';
export const SCHEMA_AUTH = 'auth';

const PG_NOW = `to_char((now() AT TIME ZONE 'UTC'), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;

let pgPool = null;

export async function getPool() {
  if (pgPool) return pgPool;
  const { default: pg } = await import('pg');
  pgPool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    // As consultas do sgoa usam nome de tabela sem prefixo: a search_path resolve
    // para o schema do sgoa. `auth.*` é sempre qualificado nas consultas.
    options: `-c search_path=${SCHEMA_SGOA}`,
    max: Number(process.env.PG_POOL_MAX) || 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  pgPool.on('error', (err) => console.error('[PG] erro no pool:', err.message));
  return pgPool;
}

// Executa um script com múltiplos statements. No node-postgres não existe
// multi-result, então divide em statements individuais.
export async function execScript(sql) {
  const pool = await getPool();
  for (const stmt of String(sql).split(';')) {
    const s = stmt.trim();
    if (s) await pool.query(s);
  }
}

// Schema canônico do sgoa. `usuarios` deixou de existir: a identidade mora em
// `auth.users` (dono: saga). Sem coluna de senha e sem `recuperacoes_senha` —
// o sgoa não autentica credencial, só verifica sessão (T10).
export const SCHEMA = `
CREATE SCHEMA IF NOT EXISTS ${SCHEMA_SGOA};

CREATE TABLE IF NOT EXISTS ${SCHEMA_SGOA}.perfis (
  id_perfil  TEXT PRIMARY KEY,
  id_usuario UUID NOT NULL REFERENCES ${SCHEMA_AUTH}.users (id),
  papel      TEXT NOT NULL,
  UNIQUE (id_usuario, papel)
);

-- Entidades do sgoa: perdem as colunas que agora são canônicas em
-- auth.user_profiles (matricula, curso, programa_pos, departamento, data_matricula).
CREATE TABLE IF NOT EXISTS ${SCHEMA_SGOA}.professores (
  id_professor TEXT PRIMARY KEY,
  id_usuario   UUID NOT NULL UNIQUE REFERENCES ${SCHEMA_AUTH}.users (id)
);

CREATE TABLE IF NOT EXISTS ${SCHEMA_SGOA}.alunos (
  id_aluno   TEXT PRIMARY KEY,
  id_usuario UUID NOT NULL UNIQUE REFERENCES ${SCHEMA_AUTH}.users (id)
);

-- Prazos regulatórios por nível (meses a partir da data de matrícula do aluno).
-- Editável pelo coordenador. NULL = sem prazo (TCC).
CREATE TABLE IF NOT EXISTS ${SCHEMA_SGOA}.parametros_prazos (
  nivel                    TEXT PRIMARY KEY CHECK (nivel IN ('TCC', 'Mestrado', 'Doutorado')),
  prazo_conclusao_meses    INTEGER CHECK (prazo_conclusao_meses IS NULL OR prazo_conclusao_meses >= 0),
  prazo_qualificacao_meses INTEGER CHECK (prazo_qualificacao_meses IS NULL OR prazo_qualificacao_meses >= 0),
  data_atualizacao         TEXT
);

CREATE TABLE IF NOT EXISTS ${SCHEMA_SGOA}.orientacoes (
  id_orientacao        TEXT PRIMARY KEY,
  id_orientador        TEXT NOT NULL REFERENCES ${SCHEMA_SGOA}.professores(id_professor),
  id_aluno             TEXT NOT NULL REFERENCES ${SCHEMA_SGOA}.alunos(id_aluno),
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

-- Config de avisos por orientação (professor define dias de antecedência e frequência).
CREATE TABLE IF NOT EXISTS ${SCHEMA_SGOA}.config_avisos_orientacao (
  id_orientacao             TEXT PRIMARY KEY REFERENCES ${SCHEMA_SGOA}.orientacoes(id_orientacao) ON DELETE CASCADE,
  dias_antes_qualificacao   INTEGER NOT NULL DEFAULT 30 CHECK (dias_antes_qualificacao >= 0),
  dias_antes_defesa         INTEGER NOT NULL DEFAULT 30 CHECK (dias_antes_defesa >= 0),
  frequencia                TEXT NOT NULL DEFAULT 'semanal' CHECK (frequencia IN ('diaria', 'semanal', 'mensal')),
  data_atualizacao          TEXT
);

-- Log de avisos enviados (idempotência + cálculo da frequência).
CREATE TABLE IF NOT EXISTS ${SCHEMA_SGOA}.lembretes_enviados (
  id_lembrete   TEXT PRIMARY KEY,
  id_orientacao TEXT NOT NULL REFERENCES ${SCHEMA_SGOA}.orientacoes(id_orientacao) ON DELETE CASCADE,
  etapa         TEXT NOT NULL CHECK (etapa IN ('qualificacao', 'defesa')),
  data_envio    TEXT NOT NULL DEFAULT (${PG_NOW})
);
CREATE INDEX IF NOT EXISTS idx_lembretes_orientacao_etapa ON ${SCHEMA_SGOA}.lembretes_enviados(id_orientacao, etapa);

CREATE TABLE IF NOT EXISTS ${SCHEMA_SGOA}.co_orientadores (
  id_co_orientador  TEXT PRIMARY KEY,
  id_orientacao     TEXT NOT NULL REFERENCES ${SCHEMA_SGOA}.orientacoes(id_orientacao) ON DELETE CASCADE,
  id_professor      TEXT NOT NULL REFERENCES ${SCHEMA_SGOA}.professores(id_professor),
  UNIQUE (id_orientacao, id_professor)
);

CREATE TABLE IF NOT EXISTS ${SCHEMA_SGOA}.reunioes (
  id_reuniao              TEXT PRIMARY KEY,
  id_orientacao           TEXT NOT NULL REFERENCES ${SCHEMA_SGOA}.orientacoes(id_orientacao) ON DELETE CASCADE,
  data_hora               TEXT NOT NULL,
  pauta                   TEXT,
  decisoes_proximos_passos TEXT,
  participantes           TEXT,
  link                    TEXT,
  google_event_id         TEXT,
  data_cadastro           TEXT NOT NULL DEFAULT (${PG_NOW})
);

CREATE TABLE IF NOT EXISTS ${SCHEMA_SGOA}.integracoes_google (
  id_usuario        UUID PRIMARY KEY REFERENCES ${SCHEMA_AUTH}.users (id) ON DELETE CASCADE,
  email_google      TEXT NOT NULL,
  refresh_token_enc TEXT NOT NULL,
  access_token      TEXT,
  expira_em         TEXT,
  data_conexao      TEXT NOT NULL DEFAULT (${PG_NOW})
);
CREATE INDEX IF NOT EXISTS idx_integracoes_email ON ${SCHEMA_SGOA}.integracoes_google(email_google);

CREATE TABLE IF NOT EXISTS ${SCHEMA_SGOA}.tarefas (
  id_tarefa        TEXT PRIMARY KEY,
  id_orientacao    TEXT NOT NULL REFERENCES ${SCHEMA_SGOA}.orientacoes(id_orientacao) ON DELETE CASCADE,
  id_responsavel   UUID NOT NULL REFERENCES ${SCHEMA_AUTH}.users (id),
  id_criador       UUID REFERENCES ${SCHEMA_AUTH}.users (id),
  titulo           TEXT,
  descricao        TEXT NOT NULL,
  prioridade       TEXT NOT NULL DEFAULT 'Média'
                   CHECK (prioridade IN ('Baixa', 'Média', 'Alta')),
  cor              TEXT NOT NULL DEFAULT 'branco'
                   CHECK (cor IN ('branco', 'azul', 'amarelo', 'lilas', 'menta', 'neutro')),
  ordem            REAL NOT NULL DEFAULT 0,
  data_limite      TEXT,
  status           TEXT NOT NULL DEFAULT 'Pendente'
                   CHECK (status IN ('Pendente', 'Em Andamento', 'Concluída', 'Atrasada')),
  concluida_em     TEXT,
  excluida_em      TEXT,
  id_excluidor     UUID REFERENCES ${SCHEMA_AUTH}.users (id),
  data_cadastro    TEXT NOT NULL DEFAULT (${PG_NOW}),
  data_atualizacao TEXT
);

CREATE TABLE IF NOT EXISTS ${SCHEMA_SGOA}.tipos_documento (
  id_tipo          TEXT PRIMARY KEY,
  nome             TEXT NOT NULL UNIQUE,
  descricao        TEXT,
  prompt_padrao    TEXT NOT NULL,
  ativo            INTEGER NOT NULL DEFAULT 1,
  data_criacao     TEXT NOT NULL DEFAULT (${PG_NOW})
);

CREATE TABLE IF NOT EXISTS ${SCHEMA_SGOA}.documentos (
  id_documento           TEXT PRIMARY KEY,
  id_orientacao          TEXT NOT NULL REFERENCES ${SCHEMA_SGOA}.orientacoes(id_orientacao) ON DELETE CASCADE,
  id_uploader            UUID NOT NULL REFERENCES ${SCHEMA_AUTH}.users (id),
  id_tipo_documento      TEXT REFERENCES ${SCHEMA_SGOA}.tipos_documento(id_tipo),
  nome_arquivo           TEXT NOT NULL,
  tipo_arquivo           TEXT,
  caminho_armazenamento  TEXT NOT NULL,
  descricao              TEXT,
  versao                 INTEGER NOT NULL DEFAULT 1,
  data_upload            TEXT NOT NULL DEFAULT (${PG_NOW})
);

-- Enlaces Overleaf (RF.OV) - link registrado pelo aluno. O destaque é por usuário.
CREATE TABLE IF NOT EXISTS ${SCHEMA_SGOA}.enlaces_overleaf (
  id_enlace     TEXT PRIMARY KEY,
  id_orientacao TEXT NOT NULL REFERENCES ${SCHEMA_SGOA}.orientacoes(id_orientacao) ON DELETE CASCADE,
  id_criador    UUID NOT NULL REFERENCES ${SCHEMA_AUTH}.users (id),
  categoria     TEXT NOT NULL CHECK (categoria IN (${valoresDoCheck(CATEGORIAS_ENLACE)})),
  url           TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'Vigente' CHECK (status IN (${valoresDoCheck(ESTADOS_ENLACE)})),
  observacao    TEXT,
  criado_em     TEXT NOT NULL DEFAULT (${PG_NOW}),
  atualizado_em TEXT,
  UNIQUE (id_orientacao, url)
);

CREATE TABLE IF NOT EXISTS ${SCHEMA_SGOA}.enlaces_destacados (
  id_destacado  TEXT PRIMARY KEY,
  id_enlace     TEXT NOT NULL REFERENCES ${SCHEMA_SGOA}.enlaces_overleaf(id_enlace) ON DELETE CASCADE,
  id_usuario    UUID NOT NULL REFERENCES ${SCHEMA_AUTH}.users (id) ON DELETE CASCADE,
  destacado_em  TEXT NOT NULL DEFAULT (${PG_NOW}),
  UNIQUE (id_enlace, id_usuario)
);

CREATE TABLE IF NOT EXISTS ${SCHEMA_SGOA}.mensagens (
  id_mensagem   TEXT PRIMARY KEY,
  id_orientacao TEXT NOT NULL REFERENCES ${SCHEMA_SGOA}.orientacoes(id_orientacao) ON DELETE CASCADE,
  id_remetente  UUID NOT NULL REFERENCES ${SCHEMA_AUTH}.users (id),
  conteudo      TEXT NOT NULL,
  data_envio    TEXT NOT NULL DEFAULT (${PG_NOW})
);

CREATE TABLE IF NOT EXISTS ${SCHEMA_SGOA}.notificacoes (
  id_notificacao TEXT PRIMARY KEY,
  id_usuario     UUID NOT NULL REFERENCES ${SCHEMA_AUTH}.users (id),
  tipo           TEXT NOT NULL,
  titulo         TEXT NOT NULL,
  mensagem       TEXT,
  lida           INTEGER NOT NULL DEFAULT 0,
  data_criacao   TEXT NOT NULL DEFAULT (${PG_NOW})
);

CREATE TABLE IF NOT EXISTS ${SCHEMA_SGOA}.prompts_avaliacao (
  id_prompt        TEXT PRIMARY KEY,
  id_professor     TEXT NOT NULL REFERENCES ${SCHEMA_SGOA}.professores(id_professor) ON DELETE CASCADE,
  id_tipo          TEXT NOT NULL REFERENCES ${SCHEMA_SGOA}.tipos_documento(id_tipo),
  prompt           TEXT NOT NULL,
  data_atualizacao TEXT,
  UNIQUE (id_professor, id_tipo)
);

CREATE TABLE IF NOT EXISTS ${SCHEMA_SGOA}.avaliacoes (
  id_avaliacao     TEXT PRIMARY KEY,
  id_documento     TEXT NOT NULL UNIQUE REFERENCES ${SCHEMA_SGOA}.documentos(id_documento) ON DELETE CASCADE,
  id_orientacao    TEXT NOT NULL REFERENCES ${SCHEMA_SGOA}.orientacoes(id_orientacao) ON DELETE CASCADE,
  id_professor     TEXT NOT NULL REFERENCES ${SCHEMA_SGOA}.professores(id_professor),
  id_tipo          TEXT REFERENCES ${SCHEMA_SGOA}.tipos_documento(id_tipo),
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

CREATE INDEX IF NOT EXISTS idx_tarefas_orientacao ON ${SCHEMA_SGOA}.tarefas(id_orientacao);
CREATE INDEX IF NOT EXISTS idx_tarefas_responsavel ON ${SCHEMA_SGOA}.tarefas(id_responsavel);
CREATE INDEX IF NOT EXISTS idx_tarefas_kanban ON ${SCHEMA_SGOA}.tarefas(id_orientacao, status, ordem);
CREATE INDEX IF NOT EXISTS idx_reunioes_orientacao ON ${SCHEMA_SGOA}.reunioes(id_orientacao);
CREATE INDEX IF NOT EXISTS idx_reunioes_google_event ON ${SCHEMA_SGOA}.reunioes(google_event_id);
CREATE INDEX IF NOT EXISTS idx_documentos_orientacao ON ${SCHEMA_SGOA}.documentos(id_orientacao);
CREATE INDEX IF NOT EXISTS idx_mensagens_orientacao ON ${SCHEMA_SGOA}.mensagens(id_orientacao);
CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario ON ${SCHEMA_SGOA}.notificacoes(id_usuario);
CREATE INDEX IF NOT EXISTS idx_orientacoes_orientador ON ${SCHEMA_SGOA}.orientacoes(id_orientador);
CREATE INDEX IF NOT EXISTS idx_orientacoes_aluno ON ${SCHEMA_SGOA}.orientacoes(id_aluno);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_orientacao ON ${SCHEMA_SGOA}.avaliacoes(id_orientacao);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_documento ON ${SCHEMA_SGOA}.avaliacoes(id_documento);
CREATE INDEX IF NOT EXISTS idx_prompts_professor ON ${SCHEMA_SGOA}.prompts_avaliacao(id_professor);
CREATE INDEX IF NOT EXISTS idx_enlaces_orientacao ON ${SCHEMA_SGOA}.enlaces_overleaf(id_orientacao);
CREATE INDEX IF NOT EXISTS idx_destacados_usuario ON ${SCHEMA_SGOA}.enlaces_destacados(id_usuario);
`;

export async function initDatabase() {
  await execScript(SCHEMA);

  // O sgoa não cria o schema auth — só confere que ele existe (dono: saga).
  const authUsers = await (await getPool()).query(`SELECT to_regclass('auth.users') AS tabela`);
  if (!authUsers.rows[0]?.tabela) {
    console.warn(
      '[DB] auth.users não existe. O schema `auth` é criado pelo saga (saga/db/schema.sql); ' +
        'o sgoa nunca migra tabela desse schema.',
    );
  }

  // parametros_prazos: garante as 3 linhas (nunca sobrescreve edição do coordenador).
  await execScript(`INSERT INTO ${SCHEMA_SGOA}.parametros_prazos (nivel, prazo_conclusao_meses, prazo_qualificacao_meses)
    VALUES ('TCC', NULL, NULL), ('Mestrado', 24, 14), ('Doutorado', 48, 24)
    ON CONFLICT (nivel) DO NOTHING`);

  await ensureTiposBase();

  // Kanban: CREATE TABLE IF NOT EXISTS não adiciona colunas a um banco já criado.
  await migrarTarefasPg();
}

// Kanban em banco Postgres já existente (colunas do quadro + arquivamento).
// Idempotente. As FK de usuário apontam para `auth.users` (dono: saga) — o sgoa
// nunca altera o schema `auth`, só declara a referência.
async function migrarTarefasPg() {
  const pool = await getPool();
  const { rows } = await pool.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = '${SCHEMA_SGOA}' AND table_name = 'tarefas'`,
  );
  const cols = rows.map((r) => r.column_name);
  const add = async (nome, sql) => {
    if (!cols.includes(nome)) await pool.query(`ALTER TABLE ${SCHEMA_SGOA}.tarefas ${sql}`);
  };
  await add('id_criador', `ADD COLUMN id_criador UUID REFERENCES ${SCHEMA_AUTH}.users (id)`);
  await add('titulo', 'ADD COLUMN titulo TEXT');
  await add('prioridade', "ADD COLUMN prioridade TEXT NOT NULL DEFAULT 'Média'");
  await add('cor', "ADD COLUMN cor TEXT NOT NULL DEFAULT 'branco'");
  await add('ordem', 'ADD COLUMN ordem REAL NOT NULL DEFAULT 0');
  await add('excluida_em', 'ADD COLUMN excluida_em TEXT');
  await add('id_excluidor', `ADD COLUMN id_excluidor UUID REFERENCES ${SCHEMA_AUTH}.users (id)`);

  await pool.query(
    `UPDATE ${SCHEMA_SGOA}.tarefas SET titulo = LEFT(descricao, 80) WHERE titulo IS NULL OR titulo = ''`,
  );

  if (!cols.includes('ordem')) {
    await pool.query(`
      WITH ranked AS (
        SELECT id_tarefa, ROW_NUMBER() OVER (
          PARTITION BY id_orientacao, status
          ORDER BY CASE WHEN data_limite IS NULL THEN 1 ELSE 0 END, data_limite, data_cadastro
        ) AS rn
        FROM ${SCHEMA_SGOA}.tarefas
      )
      UPDATE ${SCHEMA_SGOA}.tarefas t SET ordem = ranked.rn
      FROM ranked WHERE ranked.id_tarefa = t.id_tarefa
    `);
  }
}

// Insere os tipos base que faltarem (nunca altera os existentes nem os criados
// por coordenadores). Chamado no boot; o seed recria o banco do zero via SCHEMA.
export async function ensureTiposBase() {
  const { all, run } = await import('../utils/query.js');
  const existentes = new Set((await all(`SELECT nome FROM ${SCHEMA_SGOA}.tipos_documento`)).map((r) => r.nome));
  for (const t of TIPOS_DOCUMENTO_BASE) {
    if (!existentes.has(t.nome)) {
      await run(
        `INSERT INTO ${SCHEMA_SGOA}.tipos_documento (id_tipo, nome, descricao, prompt_padrao) VALUES (?, ?, ?, ?)`,
        [randomUUID(), t.nome, t.descricao || null, PROMPTS_PADRAO[t.nome]],
      );
    }
  }
}

export function now() {
  return new Date().toISOString();
}
