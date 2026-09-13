import { all, get, run } from '../utils/query.js';
import { uuid } from '../utils/id.js';

export async function create({ idOrientacao, dataHora, pauta, decisoes, participantes, link, googleEventId }) {
  const id = uuid();
  run(
    `INSERT INTO reunioes (id_reuniao, id_orientacao, data_hora, pauta, decisoes_proximos_passos, participantes, link, google_event_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      idOrientacao,
      dataHora,
      pauta ?? null,
      decisoes ?? null,
      participantes ? JSON.stringify(participantes) : null,
      link ?? null,
      googleEventId ?? null,
    ],
  );
  return findById(id);
}

export async function findById(id) {
  const row = get(
    `SELECT r.*, o.titulo_provisorio FROM reunioes r
     JOIN orientacoes o ON o.id_orientacao = r.id_orientacao
     WHERE r.id_reuniao = ?`,
    [id],
  );
  return row ? { ...row, participantes: row.participantes ? JSON.parse(row.participantes) : [] } : null;
}

export async function listByOrientacao(idOrientacao) {
  const rows = all('SELECT * FROM reunioes WHERE id_orientacao = ? ORDER BY data_hora DESC', [idOrientacao]);
  return rows.map((r) => ({ ...r, participantes: r.participantes ? JSON.parse(r.participantes) : [] }));
}

export async function findByIdInOrientacao(idReuniao, idOrientacao) {
  const row = get('SELECT * FROM reunioes WHERE id_reuniao = ? AND id_orientacao = ?', [idReuniao, idOrientacao]);
  return row ? { ...row, participantes: row.participantes ? JSON.parse(row.participantes) : [] } : null;
}

export async function removeById(id) {
  run('DELETE FROM reunioes WHERE id_reuniao = ?', [id]);
}