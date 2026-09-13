import { all, get, run } from '../utils/query.js';
import { uuid } from '../utils/id.js';
import { now } from '../config/database.js';

export async function listAtivos(incluirInativos = false) {
  return incluirInativos
    ? await all('SELECT * FROM tipos_documento ORDER BY nome')
    : await all('SELECT * FROM tipos_documento WHERE ativo = 1 ORDER BY nome');
}

export async function findById(id) {
  return await get('SELECT * FROM tipos_documento WHERE id_tipo = ?', [id]);
}

export async function findByNome(nome) {
  return await get('SELECT * FROM tipos_documento WHERE nome = ?', [nome]);
}

export async function create({ nome, descricao, promptPadrao }) {
  const id = uuid();
  await run('INSERT INTO tipos_documento (id_tipo, nome, descricao, prompt_padrao) VALUES (?, ?, ?, ?)', [
    id,
    nome.trim(),
    descricao?.trim() || null,
    promptPadrao.trim(),
  ]);
  return findById(id);
}

export async function update(id, { nome, descricao, promptPadrao }) {
  const atual = await findById(id);
  if (!atual) return null;
  await run('UPDATE tipos_documento SET nome = ?, descricao = ?, prompt_padrao = ? WHERE id_tipo = ?', [
    nome?.trim() || atual.nome,
    descricao === undefined ? atual.descricao : descricao?.trim() || null,
    promptPadrao?.trim() || atual.prompt_padrao,
    id,
  ]);
  return findById(id);
}

export async function setAtivo(id, ativo) {
  await run('UPDATE tipos_documento SET ativo = ? WHERE id_tipo = ?', [ativo ? 1 : 0, id]);
  return findById(id);
}

export async function emUso(id) {
  const docs = await get('SELECT 1 FROM documentos WHERE id_tipo_documento = ? LIMIT 1', [id]);
  if (docs) return true;
  const avals = await get('SELECT 1 FROM avaliacoes WHERE id_tipo = ? LIMIT 1', [id]);
  return !!avals;
}

export async function remove(id) {
  await run('DELETE FROM tipos_documento WHERE id_tipo = ?', [id]);
}
