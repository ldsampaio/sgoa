import { all, get, run } from '../utils/query.js';
import { uuid } from '../utils/id.js';
import { now } from '../config/database.js';

// O destaque é por usuário (RF.OV.006): a consulta devolve 1/0 para quem está chamando
// e ordena os destacados primeiro. `CASE ... THEN 1 ELSE 0` mantém o flag INTEGER nos
// dois drivers (no Postgres `IS NOT NULL` viraria booleano e divergiria do SQLite).
const SELECT_BASE = `
  SELECT e.*, u.nome AS nome_criador, o.titulo_provisorio, o.tipo AS tipo_orientacao,
         CASE WHEN d.id_destacado IS NOT NULL THEN 1 ELSE 0 END AS destacado
  FROM enlaces_overleaf e
  JOIN usuarios u ON u.id_usuario = e.id_criador
  JOIN orientacoes o ON o.id_orientacao = e.id_orientacao
  LEFT JOIN enlaces_destacados d ON d.id_enlace = e.id_enlace AND d.id_usuario = ?
`;

const ORDEM = 'ORDER BY destacado DESC, e.criado_em DESC';

export async function create({ idOrientacao, idCriador, categoria, url, status, observacao }) {
  const id = uuid();
  await run(
    `INSERT INTO enlaces_overleaf (id_enlace, id_orientacao, id_criador, categoria, url, status, observacao)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, idOrientacao, idCriador, categoria, url, status ?? 'Vigente', observacao ?? null],
  );
  return findById(id, idCriador);
}

export async function findById(id, idUsuario = null) {
  return await get(`${SELECT_BASE} WHERE e.id_enlace = ?`, [idUsuario, id]);
}

export async function findByUrl(idOrientacao, url) {
  return await get('SELECT id_enlace FROM enlaces_overleaf WHERE id_orientacao = ? AND url = ?', [idOrientacao, url]);
}

export async function listByOrientacao(idOrientacao, idUsuario = null) {
  return await all(`${SELECT_BASE} WHERE e.id_orientacao = ? ${ORDEM}`, [idUsuario, idOrientacao]);
}

export async function listByOrientacoes(ids, idUsuario = null) {
  if (!ids.length) return [];
  const placeholders = ids.map(() => '?').join(',');
  return await all(
    `${SELECT_BASE} WHERE e.id_orientacao IN (${placeholders}) ${ORDEM}`,
    [idUsuario, ...ids],
  );
}

export async function update(id, { categoria, url, status, observacao }, idUsuario = null) {
  const atual = await get('SELECT * FROM enlaces_overleaf WHERE id_enlace = ?', [id]);
  if (!atual) return null;
  await run(
    `UPDATE enlaces_overleaf
     SET categoria = ?, url = ?, status = ?, observacao = ?, atualizado_em = ?
     WHERE id_enlace = ?`,
    [
      categoria ?? atual.categoria,
      url ?? atual.url,
      status ?? atual.status,
      observacao === undefined ? atual.observacao : observacao ?? null,
      now(),
      id,
    ],
  );
  return findById(id, idUsuario);
}

export async function removeById(id) {
  await run('DELETE FROM enlaces_overleaf WHERE id_enlace = ?', [id]);
}

// RF.OV.006 — destaque individual: fixar para um usuário não muda a lista de outro.
export async function alternarDestaque(idEnlace, idUsuario) {
  const existente = await get(
    'SELECT id_destacado FROM enlaces_destacados WHERE id_enlace = ? AND id_usuario = ?',
    [idEnlace, idUsuario],
  );
  if (existente) {
    await run('DELETE FROM enlaces_destacados WHERE id_destacado = ?', [existente.id_destacado]);
    return false;
  }
  await run(
    'INSERT INTO enlaces_destacados (id_destacado, id_enlace, id_usuario, destacado_em) VALUES (?, ?, ?, ?)',
    [uuid(), idEnlace, idUsuario, now()],
  );
  return true;
}
