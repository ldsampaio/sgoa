import { get, run } from '../utils/query.js';
import { now } from '../config/database.js';

export const FREQUENCIAS = ['diaria', 'semanal', 'mensal'];

export const PADRAO = { dias_antes_qualificacao: 30, dias_antes_defesa: 30, frequencia: 'semanal' };

export async function findByOrientacao(idOrientacao) {
  return await get('SELECT * FROM config_avisos_orientacao WHERE id_orientacao = ?', [idOrientacao]);
}

export async function getOrDefault(idOrientacao) {
  const cfg = await findByOrientacao(idOrientacao);
  if (cfg) return cfg;
  await run(
    `INSERT INTO config_avisos_orientacao (id_orientacao, dias_antes_qualificacao, dias_antes_defesa, frequencia)
     VALUES (?, ?, ?, ?)`,
    [idOrientacao, PADRAO.dias_antes_qualificacao, PADRAO.dias_antes_defesa, PADRAO.frequencia],
  );
  return findByOrientacao(idOrientacao);
}

export async function update(idOrientacao, { diasAntesQualificacao, diasAntesDefesa, frequencia }) {
  await getOrDefault(idOrientacao);
  await run(
    `UPDATE config_avisos_orientacao
     SET dias_antes_qualificacao = ?, dias_antes_defesa = ?, frequencia = ?, data_atualizacao = ?
     WHERE id_orientacao = ?`,
    [diasAntesQualificacao, diasAntesDefesa, frequencia, now(), idOrientacao],
  );
  return findByOrientacao(idOrientacao);
}
