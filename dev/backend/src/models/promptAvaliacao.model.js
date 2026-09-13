import { all, get, run } from '../utils/query.js';
import { uuid } from '../utils/id.js';
import { now } from '../config/database.js';

export async function listarPorProfessor(idProfessor) {
  return await all(
    `SELECT p.*, t.nome AS tipo, t.ativo AS tipo_ativo
     FROM prompts_avaliacao p JOIN tipos_documento t ON t.id_tipo = p.id_tipo
     WHERE p.id_professor = ? ORDER BY t.nome`,
    [idProfessor],
  );
}

export async function getParaProfessor(idProfessor, idTipo) {
  return await get('SELECT * FROM prompts_avaliacao WHERE id_professor = ? AND id_tipo = ?', [idProfessor, idTipo]);
}

async function getEnriquecido(idProfessor, idTipo) {
  return await get(
    `SELECT p.*, t.nome AS tipo, t.ativo AS tipo_ativo
     FROM prompts_avaliacao p JOIN tipos_documento t ON t.id_tipo = p.id_tipo
     WHERE p.id_professor = ? AND p.id_tipo = ?`,
    [idProfessor, idTipo],
  );
}

export async function upsert(idProfessor, idTipo, prompt) {
  const existente = await getParaProfessor(idProfessor, idTipo);
  if (existente) {
    await run('UPDATE prompts_avaliacao SET prompt = ?, data_atualizacao = ? WHERE id_prompt = ?', [
      prompt,
      now(),
      existente.id_prompt,
    ]);
  } else {
    const id = uuid();
    await run('INSERT INTO prompts_avaliacao (id_prompt, id_professor, id_tipo, prompt) VALUES (?, ?, ?, ?)', [
      id,
      idProfessor,
      idTipo,
      prompt,
    ]);
  }
  return getEnriquecido(idProfessor, idTipo);
}

// Garante uma linha por tipo ativo (idempotente, nunca sobrescreve customs).
// Chamada no seed, ao criar professor e ao criar novo tipo.
export async function garantirParaProfessor(idProfessor, tipos) {
  const lista = tipos || (await all('SELECT id_tipo FROM tipos_documento WHERE ativo = 1'));
  for (const t of lista) {
    if (!(await getParaProfessor(idProfessor, t.id_tipo))) {
      const tipo = await get('SELECT prompt_padrao, nome FROM tipos_documento WHERE id_tipo = ?', [t.id_tipo]);
      if (tipo) {
        const id = uuid();
        await run('INSERT INTO prompts_avaliacao (id_prompt, id_professor, id_tipo, prompt) VALUES (?, ?, ?, ?)', [
          id,
          idProfessor,
          t.id_tipo,
          tipo.prompt_padrao,
        ]);
      }
    }
  }
  return listarPorProfessor(idProfessor);
}

// Compat: garante os padrões (todos os tipos ativos) — usado no seed.
export async function garantirPadroes(idProfessor) {
  return garantirParaProfessor(idProfessor);
}

// Resolve o prompt vigente com fallback para o padrão do tipo.
export async function resolverPrompt(idProfessor, idTipo) {
  const custom = await getParaProfessor(idProfessor, idTipo);
  if (custom?.prompt) return custom.prompt;
  const tipo = await get('SELECT prompt_padrao FROM tipos_documento WHERE id_tipo = ?', [idTipo]);
  return tipo?.prompt_padrao || null;
}
