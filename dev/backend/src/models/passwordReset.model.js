import { all, get, run } from '../utils/query.js';
import { uuid } from '../utils/id.js';
import { now } from '../config/database.js';

// Códigos de recuperação de senha (RF.GU.003).
// O código em texto puro NUNCA é persistido — só o hash com salt.

export async function invalidarAnteriores(idUsuario) {
  await run(
    `UPDATE recuperacoes_senha SET usado_em = COALESCE(usado_em, ?)
     WHERE id_usuario = ? AND usado_em IS NULL`,
    [now(), idUsuario],
  );
}

export async function criar({ idUsuario, codigoHash, expiraEm }) {
  const id = uuid();
  await run(
    `INSERT INTO recuperacoes_senha (id, id_usuario, codigo_hash, expira_em, tentativas)
     VALUES (?, ?, ?, ?, 0)`,
    [id, idUsuario, codigoHash, expiraEm],
  );
  return await get('SELECT * FROM recuperacoes_senha WHERE id = ?', [id]);
}

export async function buscarAtivo(idUsuario) {
  return await get(
    `SELECT * FROM recuperacoes_senha
     WHERE id_usuario = ? AND usado_em IS NULL
     ORDER BY criado_em DESC LIMIT 1`,
    [idUsuario],
  );
}

export async function contarRecentes(idUsuario, desdeIso) {
  const row = await get(
    `SELECT COUNT(*) AS total FROM recuperacoes_senha
     WHERE id_usuario = ? AND criado_em >= ?`,
    [idUsuario, desdeIso],
  );
  // COUNT(*) volta como string no Postgres (int8); número no SQLite.
  return Number(row?.total ?? 0);
}

export async function incrementarTentativa(id) {
  await run('UPDATE recuperacoes_senha SET tentativas = tentativas + 1 WHERE id = ?', [id]);
  return await get('SELECT * FROM recuperacoes_senha WHERE id = ?', [id]);
}

export async function marcarUsado(id) {
  await run(`UPDATE recuperacoes_senha SET usado_em = ? WHERE id = ?`, [now(), id]);
}

export async function listarParaLimpeza() {
  return await all(
    `SELECT id FROM recuperacoes_senha
     WHERE usado_em IS NOT NULL OR expira_em < ?`,
    [now()],
  );
}
