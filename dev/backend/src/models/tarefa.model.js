import { all, get, run } from '../utils/query.js';
import { uuid } from '../utils/id.js';
import { now } from '../config/database.js';

const STATUS = ['Pendente', 'Em Andamento', 'Concluída', 'Atrasada'];

export async function create({ idOrientacao, idResponsavel, descricao, dataLimite }) {
  const id = uuid();
  await run(
    `INSERT INTO tarefas (id_tarefa, id_orientacao, id_responsavel, descricao, data_limite)
     VALUES (?, ?, ?, ?, ?)`,
    [id, idOrientacao, idResponsavel, descricao, dataLimite ?? null],
  );
  return await get(
    `SELECT t.*, u.nome AS nome_responsavel FROM tarefas t
     JOIN usuarios u ON u.id_usuario = t.id_responsavel
     WHERE t.id_tarefa = ?`,
    [id],
  );
}

export async function findById(id) {
  return await get(
    `SELECT t.*, u.nome AS nome_responsavel FROM tarefas t
     JOIN usuarios u ON u.id_usuario = t.id_responsavel
     WHERE t.id_tarefa = ?`,
    [id],
  );
}

export async function listByOrientacao(idOrientacao) {
  return await all(
    `SELECT t.*, u.nome AS nome_responsavel FROM tarefas t
     JOIN usuarios u ON u.id_usuario = t.id_responsavel
     WHERE t.id_orientacao = ? ORDER BY t.data_limite ASC, t.data_cadastro DESC`,
    [idOrientacao],
  );
}

export async function updateStatus(id, status) {
  if (!STATUS.includes(status)) status = STATUS[0];
  const concluidaEm = status === 'Concluída' ? now() : null;
  await run(
    'UPDATE tarefas SET status = ?, concluida_em = ?, data_atualizacao = ? WHERE id_tarefa = ?',
    [status, concluidaEm, now(), id],
  );
  return findById(id);
}

export async function listPendentesPorOrientacoes(orientacoesIds) {
  if (!orientacoesIds?.length) return [];
  const params = orientacoesIds;
  return await all(
    `SELECT t.*, u_resp.nome AS nome_responsavel, u_aluno.nome AS nome_aluno,
            o.titulo_provisorio, o.tipo
     FROM tarefas t
     JOIN orientacoes o ON o.id_orientacao = t.id_orientacao
     JOIN alunos a ON a.id_aluno = o.id_aluno
     JOIN usuarios u_aluno ON u_aluno.id_usuario = a.id_usuario
     JOIN usuarios u_resp ON u_resp.id_usuario = t.id_responsavel
     WHERE t.id_orientacao IN (${orientacoesIds.map(() => '?').join(',')})
       AND t.status <> 'Concluída'
     ORDER BY CASE WHEN t.data_limite IS NULL THEN 1 ELSE 0 END, t.data_limite ASC
     LIMIT 20`,
    params,
  );
}

export async function listParaDashboard(idUsuario, { orientacoesIds = null } = {}) {
  const params = [idUsuario];
  let extra = '';
  if (orientacoesIds?.length) {
    extra = `AND t.id_orientacao IN (${orientacoesIds.map(() => '?').join(',')})`;
    params.push(...orientacoesIds);
  }
  return await all(
    `SELECT t.*, o.titulo_provisorio, u_aluno.nome AS nome_aluno, a.curso
     FROM tarefas t
     JOIN orientacoes o ON o.id_orientacao = t.id_orientacao
     JOIN alunos a ON a.id_aluno = o.id_aluno
     JOIN usuarios u_aluno ON u_aluno.id_usuario = a.id_usuario
     WHERE t.id_responsavel = ? ${extra}
     ORDER BY (t.status = 'Concluída'), CASE WHEN t.data_limite IS NULL THEN 1 ELSE 0 END, t.data_limite ASC
     LIMIT 20`,
    params,
  );
}