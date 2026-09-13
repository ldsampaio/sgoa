import { all, get, run } from '../utils/query.js';
import { uuid } from '../utils/id.js';

export async function create({ idOrientacao, idRemetente, conteudo }) {
  const id = uuid();
  run(
    'INSERT INTO mensagens (id_mensagem, id_orientacao, id_remetente, conteudo) VALUES (?, ?, ?, ?)',
    [id, idOrientacao, idRemetente, conteudo],
  );
  return get(
    `SELECT m.*, u.nome AS nome_remetente FROM mensagens m
     JOIN usuarios u ON u.id_usuario = m.id_remetente
     WHERE m.id_mensagem = ?`,
    [id],
  );
}

export async function listByOrientacao(idOrientacao) {
  return all(
    `SELECT m.*, u.nome AS nome_remetente FROM mensagens m
     JOIN usuarios u ON u.id_usuario = m.id_remetente
     WHERE m.id_orientacao = ? ORDER BY m.data_envio ASC`,
    [idOrientacao],
  );
}