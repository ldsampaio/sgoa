import { all, get, run } from '../utils/query.js';
import { uuid } from '../utils/id.js';

export async function create({ idUsuario, tipo, titulo, mensagem }) {
  const id = uuid();
  await run(
    'INSERT INTO notificacoes (id_notificacao, id_usuario, tipo, titulo, mensagem) VALUES (?, ?, ?, ?, ?)',
    [id, idUsuario, tipo, titulo, mensagem ?? null],
  );
  return findById(id);
}

export async function findById(id) {
  return await get('SELECT * FROM notificacoes WHERE id_notificacao = ?', [id]);
}

export async function listForUsuario(idUsuario) {
  return await all('SELECT * FROM notificacoes WHERE id_usuario = ? ORDER BY data_criacao DESC LIMIT 30', [idUsuario]);
}

export async function markRead(id) {
  await run('UPDATE notificacoes SET lida = 1 WHERE id_notificacao = ?', [id]);
  return findById(id);
}

export async function countUnread(idUsuario) {
  return await get('SELECT COUNT(*) AS total FROM notificacoes WHERE id_usuario = ? AND lida = 0', [idUsuario]).total;
}