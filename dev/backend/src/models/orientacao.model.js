import { all, get, run } from '../utils/query.js';
import { uuid } from '../utils/id.js';
import { now } from '../config/database.js';

export const SELECT_BASE = `
  SELECT
    o.*,
    u_aluno.nome AS nome_aluno,
    a.id_usuario AS id_usuario_aluno,
    a.data_matricula AS data_matricula_aluno,
    u_orient.nome AS nome_orientador,
    u_orient.id_usuario AS id_usuario_orientador
  FROM orientacoes o
  JOIN alunos a ON a.id_aluno = o.id_aluno
  JOIN usuarios u_aluno ON u_aluno.id_usuario = a.id_usuario
  JOIN professores pr ON pr.id_professor = o.id_orientador
  JOIN usuarios u_orient ON u_orient.id_usuario = pr.id_usuario
`;

function mapOrientacao(row) {
  if (!row) return null;
  return {
    id_orientacao: row.id_orientacao,
    tipo: row.tipo,
    titulo_provisorio: row.titulo_provisorio,
    status: row.status,
    data_inicio: row.data_inicio,
    data_previsao_fim: row.data_previsao_fim,
    data_cadastro: row.data_cadastro,
    data_atualizacao: row.data_atualizacao,
    etapas: {
      qualificacao_concluida_em: row.qualificacao_concluida_em ?? null,
      defesa_concluida_em: row.defesa_concluida_em ?? null,
      origem_marcacao: row.origem_marcacao ?? 'manual',
    },
    aluno: {
      id_aluno: row.id_aluno,
      id_usuario: row.id_usuario_aluno,
      nome: row.nome_aluno,
      data_matricula: row.data_matricula_aluno ?? null,
    },
    orientador: {
      id_professor: row.id_orientador,
      id_usuario: row.id_usuario_orientador,
      nome: row.nome_orientador,
    },
  };
}

async function attachCoOrientadores(orientacoes) {
  const ids = orientacoes.map((o) => o.id_orientacao);
  if (ids.length === 0) return orientacoes;
  const placeholders = ids.map(() => '?').join(',');
  const cos = all(
    `SELECT co.id_orientacao, p.id_professor, p.matricula, u.id_usuario, u.nome AS nome
     FROM co_orientadores co
     JOIN professores p ON p.id_professor = co.id_professor
     JOIN usuarios u ON u.id_usuario = p.id_usuario
     WHERE co.id_orientacao IN (${placeholders})`,
    ids,
  );
  const map = new Map();
  for (const c of cos) {
    if (!map.has(c.id_orientacao)) map.set(c.id_orientacao, []);
    map.get(c.id_orientacao).push({ id_professor: c.id_professor, id_usuario: c.id_usuario, nome: c.nome });
  }
  return orientacoes.map((o) => ({ ...o, co_orientadores: map.get(o.id_orientacao) ?? [] }));
}

export async function create({ idOrientador, idAluno, tipo, titulo, status, dataInicio, dataPrevisaoFim }) {
  const id = uuid();
  run(
    `INSERT INTO orientacoes (id_orientacao, id_orientador, id_aluno, tipo, titulo_provisorio, status, data_inicio, data_previsao_fim)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, idOrientador, idAluno, tipo, titulo ?? null, status ?? 'Em Andamento', dataInicio ?? null, dataPrevisaoFim ?? null],
  );
  return findById(id);
}

export async function findById(id) {
  const row = get(`${SELECT_BASE} WHERE o.id_orientacao = ?`, [id]);
  const mapped = mapOrientacao(row);
  if (!mapped) return null;
  const [withCos] = await attachCoOrientadores([mapped]);
  return withCos;
}

export async function listByProfessor(idProfessor) {
  const rows = all(`${SELECT_BASE} WHERE o.id_orientador = ? ORDER BY o.data_cadastro DESC`, [idProfessor]);
  return attachCoOrientadores(rows.map(mapOrientacao));
}

export async function listByAluno(idAluno) {
  const rows = all(`${SELECT_BASE} WHERE o.id_aluno = ? ORDER BY o.data_cadastro DESC`, [idAluno]);
  return attachCoOrientadores(rows.map(mapOrientacao));
}

export async function listByCoOrientador(idProfessor) {
  const rows = all(
    `${SELECT_BASE}
     JOIN co_orientadores co ON co.id_orientacao = o.id_orientacao
     WHERE co.id_professor = ? ORDER BY o.data_cadastro DESC`,
    [idProfessor],
  );
  return attachCoOrientadores(rows.map(mapOrientacao));
}

export async function listAll() {
  const rows = all(`${SELECT_BASE} ORDER BY o.data_cadastro DESC`);
  return attachCoOrientadores(rows.map(mapOrientacao));
}

export async function update(id, { titulo, status, dataPrevisaoFim }) {
  run(
    `UPDATE orientacoes
     SET titulo_provisorio = ?, status = ?, data_previsao_fim = ?, data_atualizacao = ?
     WHERE id_orientacao = ?`,
    [titulo ?? null, status ?? null, dataPrevisaoFim ?? null, now(), id],
  );
  return findById(id);
}

// Marca a conclusão de qualificação/defesa (professor orientador; RPA futuramente via origem='rpa').
export async function updateEtapas(id, { qualificacaoConcluidaEm, defesaConcluidaEm, origem }) {
  const atual = await findById(id);
  if (!atual) return null;
  run(
    `UPDATE orientacoes
     SET qualificacao_concluida_em = ?, defesa_concluida_em = ?, origem_marcacao = ?, data_atualizacao = ?
     WHERE id_orientacao = ?`,
    [
      qualificacaoConcluidaEm ?? atual.etapas.qualificacao_concluida_em,
      defesaConcluidaEm ?? atual.etapas.defesa_concluida_em,
      origem ?? 'manual',
      now(),
      id,
    ],
  );
  return findById(id);
}

export async function addCoOrientador(idOrientacao, idProfessor) {
  const id = uuid();
  run(
    'INSERT INTO co_orientadores (id_co_orientador, id_orientacao, id_professor) VALUES (?, ?, ?)',
    [id, idOrientacao, idProfessor],
  );
  return get(
    `SELECT p.id_professor, u.id_usuario, u.nome AS nome FROM co_orientadores co
     JOIN professores p ON p.id_professor = co.id_professor
     JOIN usuarios u ON u.id_usuario = p.id_usuario
     WHERE co.id_co_orientador = ?`,
    [id],
  );
}

export async function removeCoOrientador(idOrientacao, idProfessor) {
  run('DELETE FROM co_orientadores WHERE id_orientacao = ? AND id_professor = ?', [idOrientacao, idProfessor]);
}

export async function isCoOrientador(idOrientacao, idProfessor) {
  return !!get(
    'SELECT 1 FROM co_orientadores WHERE id_orientacao = ? AND id_professor = ?',
    [idOrientacao, idProfessor],
  );
}