import { all, get, run } from '../utils/query.js';
import { uuid } from '../utils/id.js';

// Códigos de recuperação de senha (RF.GU.003).
// O código em texto puro NUNCA é persistido — só o hash com salt.

export function invalidarAnteriores(idUsuario) {
  run(
    `UPDATE recuperacoes_senha SET usado_em = COALESCE(usado_em, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
     WHERE id_usuario = ? AND usado_em IS NULL`,
    [idUsuario],
  );
}

export function criar({ idUsuario, codigoHash, expiraEm }) {
  const id = uuid();
  run(
    `INSERT INTO recuperacoes_senha (id, id_usuario, codigo_hash, expira_em, tentativas)
     VALUES (?, ?, ?, ?, 0)`,
    [id, idUsuario, codigoHash, expiraEm],
  );
  return get('SELECT * FROM recuperacoes_senha WHERE id = ?', [id]);
}

export function buscarAtivo(idUsuario) {
  return get(
    `SELECT * FROM recuperacoes_senha
     WHERE id_usuario = ? AND usado_em IS NULL
     ORDER BY criado_em DESC LIMIT 1`,
    [idUsuario],
  );
}

export function contarRecentes(idUsuario, desdeIso) {
  const row = get(
    `SELECT COUNT(*) AS total FROM recuperacoes_senha
     WHERE id_usuario = ? AND criado_em >= ?`,
    [idUsuario, desdeIso],
  );
  return row?.total ?? 0;
}

export function incrementarTentativa(id) {
  run('UPDATE recuperacoes_senha SET tentativas = tentativas + 1 WHERE id = ?', [id]);
  return get('SELECT * FROM recuperacoes_senha WHERE id = ?', [id]);
}

export function marcarUsado(id) {
  run(
    `UPDATE recuperacoes_senha SET usado_em = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`,
    [id],
  );
}

export function listarParaLimpeza() {
  return all(
    `SELECT id FROM recuperacoes_senha
     WHERE usado_em IS NOT NULL OR expira_em < strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
  );
}
