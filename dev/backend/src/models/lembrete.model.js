import { all, get, run } from '../utils/query.js';
import { uuid } from '../utils/id.js';

export const ETAPAS = ['qualificacao', 'defesa'];

export async function registrar(idOrientacao, etapa) {
  const id = uuid();
  await run('INSERT INTO lembretes_enviados (id_lembrete, id_orientacao, etapa) VALUES (?, ?, ?)', [
    id,
    idOrientacao,
    etapa,
  ]);
  return await get('SELECT * FROM lembretes_enviados WHERE id_lembrete = ?', [id]);
}

export async function ultimoEnvio(idOrientacao, etapa) {
  return await get(
    `SELECT * FROM lembretes_enviados
     WHERE id_orientacao = ? AND etapa = ?
     ORDER BY data_envio DESC LIMIT 1`,
    [idOrientacao, etapa],
  );
}

export async function listarPorOrientacao(idOrientacao) {
  return await all(
    'SELECT * FROM lembretes_enviados WHERE id_orientacao = ? ORDER BY data_envio DESC',
    [idOrientacao],
  );
}
