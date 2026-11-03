import { all, get, run } from '../utils/query.js';
import { uuid } from '../utils/id.js';
import { now } from '../config/database.js';
import { STATUS_TAREFA } from '../services/tarefaConstantes.js';

export { STATUS_TAREFA };
export const STATUS = STATUS_TAREFA; // compatibilidade com imports antigos

const SELECT_BASE = `
  SELECT t.*, u.nome AS nome_responsavel, uc.nome AS nome_criador
  FROM tarefas t
  JOIN usuarios u ON u.id_usuario = t.id_responsavel
  LEFT JOIN usuarios uc ON uc.id_usuario = t.id_criador
`;

function mapTarefa(row) {
  if (!row) return null;
  return { ...row, titulo: row.titulo || row.descricao };
}

async function proximaOrdem(idOrientacao, status = 'Pendente') {
  const row = await get(
    `SELECT MIN(ordem) AS minimo FROM tarefas
     WHERE id_orientacao = ? AND status = ? AND excluida_em IS NULL`,
    [idOrientacao, status],
  );
  return row?.minimo == null ? 0 : Number(row.minimo) - 1;
}

export async function create({
  idOrientacao,
  idResponsavel,
  idCriador = null,
  titulo,
  descricao,
  dataLimite,
  prioridade = 'Média',
  cor = 'branco',
  status = 'Pendente',
  ordem = null,
}) {
  const id = uuid();
  const posicao = ordem == null ? await proximaOrdem(idOrientacao, status) : ordem;
  await run(
    `INSERT INTO tarefas
       (id_tarefa, id_orientacao, id_responsavel, id_criador, titulo, descricao,
        prioridade, cor, ordem, data_limite, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      idOrientacao,
      idResponsavel,
      idCriador,
      titulo || descricao,
      descricao,
      prioridade,
      cor,
      posicao,
      dataLimite ?? null,
      status,
    ],
  );
  return await findById(id);
}

export async function findById(id) {
  const row = await get(
    `${SELECT_BASE} WHERE t.id_tarefa = ? AND t.excluida_em IS NULL`,
    [id],
  );
  return mapTarefa(row);
}

export async function listByOrientacao(idOrientacao) {
  const rows = await all(
    `${SELECT_BASE}
     WHERE t.id_orientacao = ? AND t.excluida_em IS NULL
     ORDER BY CASE t.status
                WHEN 'Pendente' THEN 0
                WHEN 'Atrasada' THEN 0
                WHEN 'Em Andamento' THEN 1
                WHEN 'Concluída' THEN 2
                ELSE 3
              END,
              t.ordem ASC,
              CASE WHEN t.data_limite IS NULL THEN 1 ELSE 0 END,
              t.data_limite ASC,
              t.data_cadastro ASC`,
    [idOrientacao],
  );
  return rows.map(mapTarefa);
}

export async function update(id, campos = {}) {
  const sets = [];
  const params = [];
  const add = (coluna, valor) => {
    sets.push(`${coluna} = ?`);
    params.push(valor);
  };

  if (campos.titulo !== undefined) add('titulo', campos.titulo);
  if (campos.descricao !== undefined) add('descricao', campos.descricao);
  if (campos.prioridade !== undefined) add('prioridade', campos.prioridade);
  if (campos.cor !== undefined) add('cor', campos.cor);
  if (campos.id_responsavel !== undefined) add('id_responsavel', campos.id_responsavel);
  if (campos.data_limite !== undefined) add('data_limite', campos.data_limite);
  if (campos.ordem !== undefined) add('ordem', campos.ordem);

  if (campos.status !== undefined) {
    add('status', campos.status);
    if (campos.status === 'Concluída') {
      const atual = await get('SELECT concluida_em FROM tarefas WHERE id_tarefa = ?', [id]);
      add('concluida_em', atual?.concluida_em || now());
    } else {
      add('concluida_em', null);
    }
  }

  add('data_atualizacao', now());
  params.push(id);
  await run(
    `UPDATE tarefas SET ${sets.join(', ')}
     WHERE id_tarefa = ? AND excluida_em IS NULL`,
    params,
  );
  return await findById(id);
}

export async function updateStatus(id, status) {
  return await update(id, { status });
}

// Arquiva (soft delete): some das listas/quadro, mas preserva o registro.
export async function arquivar(id, idExcluidor = null) {
  const resultado = await run(
    `UPDATE tarefas
     SET excluida_em = ?, id_excluidor = ?, data_atualizacao = ?
     WHERE id_tarefa = ? AND excluida_em IS NULL`,
    [now(), idExcluidor, now(), id],
  );
  return resultado.changes > 0;
}

export async function listPendentesPorOrientacoes(orientacoesIds) {
  if (!orientacoesIds?.length) return [];
  const params = orientacoesIds;
  const rows = await all(
    `SELECT t.*, u_resp.nome AS nome_responsavel, u_aluno.nome AS nome_aluno,
            o.titulo_provisorio, o.tipo
     FROM tarefas t
     JOIN orientacoes o ON o.id_orientacao = t.id_orientacao
     JOIN alunos a ON a.id_aluno = o.id_aluno
     JOIN usuarios u_aluno ON u_aluno.id_usuario = a.id_usuario
     JOIN usuarios u_resp ON u_resp.id_usuario = t.id_responsavel
     WHERE t.id_orientacao IN (${orientacoesIds.map(() => '?').join(',')})
       AND t.status <> 'Concluída'
       AND t.excluida_em IS NULL
     ORDER BY CASE WHEN t.data_limite IS NULL THEN 1 ELSE 0 END, t.data_limite ASC
     LIMIT 20`,
    params,
  );
  return rows.map(mapTarefa);
}

export async function listParaDashboard(idUsuario, { orientacoesIds = null } = {}) {
  const params = [idUsuario];
  let extra = '';
  if (orientacoesIds?.length) {
    extra = `AND t.id_orientacao IN (${orientacoesIds.map(() => '?').join(',')})`;
    params.push(...orientacoesIds);
  }
  const rows = await all(
    `SELECT t.*, o.titulo_provisorio, u_aluno.nome AS nome_aluno, a.curso
     FROM tarefas t
     JOIN orientacoes o ON o.id_orientacao = t.id_orientacao
     JOIN alunos a ON a.id_aluno = o.id_aluno
     JOIN usuarios u_aluno ON u_aluno.id_usuario = a.id_usuario
     WHERE t.id_responsavel = ? ${extra}
       AND t.excluida_em IS NULL
     ORDER BY (t.status = 'Concluída'), CASE WHEN t.data_limite IS NULL THEN 1 ELSE 0 END, t.data_limite ASC
     LIMIT 20`,
    params,
  );
  return rows.map(mapTarefa);
}
