import { all, get, run } from '../utils/query.js';
import { uuid } from '../utils/id.js';

// Papel por sistema: resolvido na tabela de extensão do sgoa, nunca no claim
// `role` do JWT (contrato §4, passo 6).
export async function papelDe(idUsuario) {
  const row = await get('SELECT papel FROM sgoa.perfis WHERE id_usuario = ?', [idUsuario]);
  return row?.papel || null;
}

// Fallback quando o usuário ainda não tem papel registrado no sgoa: usa o
// role_base do saga (inferência ^a\d+$ → ALUNO, feita pelo saga).
export function papelDoPapelBase(roleBase) {
  const mapa = { ALUNO: 'Aluno', PROFESSOR: 'Professor' };
  return mapa[String(roleBase || '').toUpperCase()] || 'UNDEFINIDO';
}

export async function criarPapel(idUsuario, papel) {
  const id = uuid();
  await run('INSERT INTO sgoa.perfis (id_perfil, id_usuario, papel) VALUES (?, ?, ?)', [id, idUsuario, papel]);
  return await get('SELECT id_perfil, id_usuario, papel FROM sgoa.perfis WHERE id_perfil = ?', [id]);
}
