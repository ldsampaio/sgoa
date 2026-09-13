import { all, get, run } from '../utils/query.js';
import { uuid } from '../utils/id.js';

export async function create({ idOrientacao, dataHora, pauta, decisoes, participantes }) {
  const id = uuid();
  run(
    `INSERT INTO reunioes (id_reuniao, id_orientacao, data_hora, pauta, decisoes_proximos_passos, participantes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, idOrientacao, dataHora, pauta ?? null, decisoes ?? null, participantes ? JSON.stringify(participantes) : null],
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