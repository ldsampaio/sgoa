import { all, get, run } from '../utils/query.js';
import { now } from '../config/database.js';

export const NIVEIS = ['TCC', 'Mestrado', 'Doutorado'];

export async function listAll() {
  return await all('SELECT * FROM parametros_prazos ORDER BY nivel');
}

export async function findByNivel(nivel) {
  return await get('SELECT * FROM parametros_prazos WHERE nivel = ?', [nivel]);
}

export async function update(nivel, { prazoConclusaoMeses, prazoQualificacaoMeses }) {
  await run(
    `UPDATE parametros_prazos
     SET prazo_conclusao_meses = ?, prazo_qualificacao_meses = ?, data_atualizacao = ?
     WHERE nivel = ?`,
    [prazoConclusaoMeses ?? null, prazoQualificacaoMeses ?? null, now(), nivel],
  );
  return findByNivel(nivel);
}
