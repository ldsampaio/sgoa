import { all, get, run } from '../utils/query.js';
import { uuid } from '../utils/id.js';

export const ETAPAS = ['qualificacao', 'defesa'];

export function registrar(idOrientacao, etapa) {
  const id = uuid();
  run('INSERT INTO lembretes_enviados (id_lembrete, id_orientacao, etapa) VALUES (?, ?, ?)', [
    id,
    idOrientacao,
    etapa,
  ]);
  return get('SELECT * FROM lembretes_enviados WHERE id_lembrete = ?', [id]);
}

export function ultimoEnvio(idOrientacao, etapa) {
  return get(
    `SELECT * FROM lembretes_enviados
     WHERE id_orientacao = ? AND etapa = ?
     ORDER BY data_envio DESC LIMIT 1`,
    [idOrientacao, etapa],
  );
}

export function listarPorOrientacao(idOrientacao) {
  return all(
    'SELECT * FROM lembretes_enviados WHERE id_orientacao = ? ORDER BY data_envio DESC',
    [idOrientacao],
  );
}
