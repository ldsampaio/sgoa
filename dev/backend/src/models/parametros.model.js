import { all, get, run } from '../utils/query.js';
import { now } from '../config/database.js';

export const NIVEIS = ['TCC', 'Mestrado', 'Doutorado'];

export function listAll() {
  return all('SELECT * FROM parametros_prazos ORDER BY nivel');
}

export function findByNivel(nivel) {
  return get('SELECT * FROM parametros_prazos WHERE nivel = ?', [nivel]);
}

export function update(nivel, { prazoConclusaoMeses, prazoQualificacaoMeses }) {
  run(
    `UPDATE parametros_prazos
     SET prazo_conclusao_meses = ?, prazo_qualificacao_meses = ?, data_atualizacao = ?
     WHERE nivel = ?`,
    [prazoConclusaoMeses ?? null, prazoQualificacaoMeses ?? null, now(), nivel],
  );
  return findByNivel(nivel);
}
