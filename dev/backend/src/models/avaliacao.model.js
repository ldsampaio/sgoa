import { all, get, run } from '../utils/query.js';
import { uuid } from '../utils/id.js';
import { now } from '../config/database.js';

export async function create({ idDocumento, idOrientacao, idProfessor, idTipo, tipo, promptUsado }) {
  const id = uuid();
  await run(
    `INSERT INTO avaliacoes (id_avaliacao, id_documento, id_orientacao, id_professor, id_tipo, tipo, prompt_usado)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, idDocumento, idOrientacao, idProfessor, idTipo ?? null, tipo, promptUsado],
  );
  return findById(id);
}

export async function findById(id) {
  return await get(
    `SELECT a.*, d.nome_arquivo, d.versao, d.tipo_arquivo, d.descricao AS descricao_documento
     FROM avaliacoes a JOIN documentos d ON d.id_documento = a.id_documento
     WHERE a.id_avaliacao = ?`,
    [id],
  );
}

export async function findByDocumento(idDocumento) {
  return await get(
    `SELECT a.*, d.nome_arquivo, d.versao FROM avaliacoes a
     JOIN documentos d ON d.id_documento = a.id_documento
     WHERE a.id_documento = ?`,
    [idDocumento],
  );
}

export async function listByOrientacao(idOrientacao) {
  return await all(
    `SELECT a.*, d.nome_arquivo, d.versao FROM avaliacoes a
     JOIN documentos d ON d.id_documento = a.id_documento
     WHERE a.id_orientacao = ? ORDER BY a.data_criacao DESC`,
    [idOrientacao],
  );
}

export async function marcarProcessando(id) {
  await run("UPDATE avaliacoes SET status = 'processando', data_atualizacao = ? WHERE id_avaliacao = ?", [now(), id]);
  return findById(id);
}

export async function concluir(id, { resultado, nota }) {
  await run(
    `UPDATE avaliacoes
     SET status = 'concluída', resultado = ?, nota = ?, erro = NULL, data_atualizacao = ?
     WHERE id_avaliacao = ?`,
    [resultado ?? null, nota ?? null, now(), id],
  );
  return findById(id);
}

export async function falhar(id, erro) {
  await run("UPDATE avaliacoes SET status = 'falha', erro = ?, data_atualizacao = ? WHERE id_avaliacao = ?", [
    erro ?? 'Falha sem detalhes.',
    now(),
    id,
  ]);
  return findById(id);
}

// Reenvio: volta a pendente, incrementa tentativas, preserva prompt_usado original.
export async function reenviar(id) {
  await run(
    `UPDATE avaliacoes
     SET status = 'pendente', erro = NULL, tentativas = tentativas + 1, data_atualizacao = ?
     WHERE id_avaliacao = ?`,
    [now(), id],
  );
  return findById(id);
}
