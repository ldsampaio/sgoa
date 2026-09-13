import { all, get, run } from '../utils/query.js';
import { uuid } from '../utils/id.js';
import { now } from '../config/database.js';

export function listAtivos(incluirInativos = false) {
  return incluirInativos
    ? all('SELECT * FROM tipos_documento ORDER BY nome')
    : all('SELECT * FROM tipos_documento WHERE ativo = 1 ORDER BY nome');
}

export function findById(id) {
  return get('SELECT * FROM tipos_documento WHERE id_tipo = ?', [id]);
}

export function findByNome(nome) {
  return get('SELECT * FROM tipos_documento WHERE nome = ?', [nome]);
}

export function create({ nome, descricao, promptPadrao }) {
  const id = uuid();
  run('INSERT INTO tipos_documento (id_tipo, nome, descricao, prompt_padrao) VALUES (?, ?, ?, ?)', [
    id,
    nome.trim(),
    descricao?.trim() || null,
    promptPadrao.trim(),
  ]);
  return findById(id);
}

export function update(id, { nome, descricao, promptPadrao }) {
  const atual = findById(id);
  if (!atual) return null;
  run('UPDATE tipos_documento SET nome = ?, descricao = ?, prompt_padrao = ? WHERE id_tipo = ?', [
    nome?.trim() || atual.nome,
    descricao === undefined ? atual.descricao : descricao?.trim() || null,
    promptPadrao?.trim() || atual.prompt_padrao,
    id,
  ]);
  return findById(id);
}

export function setAtivo(id, ativo) {
  run('UPDATE tipos_documento SET ativo = ? WHERE id_tipo = ?', [ativo ? 1 : 0, id]);
  return findById(id);
}

export function emUso(id) {
  const docs = get('SELECT 1 FROM documentos WHERE id_tipo_documento = ? LIMIT 1', [id]);
  if (docs) return true;
  const avals = get('SELECT 1 FROM avaliacoes WHERE id_tipo = ? LIMIT 1', [id]);
  return !!avals;
}

export function remove(id) {
  run('DELETE FROM tipos_documento WHERE id_tipo = ?', [id]);
}
