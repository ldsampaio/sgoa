import { all, get, run } from '../utils/query.js';
import { uuid } from '../utils/id.js';

// Papel por sistema: resolvido na tabela de extensão do sgoa, nunca no claim
// `role` do JWT (contrato §4, passo 6). `sgoa.perfis` aceita mais de um papel por
// usuário (UNIQUE é (id_usuario, papel)), então a checagem é por LISTA.
export async function papeisDe(idUsuario) {
  const linhas = await all('SELECT papel FROM sgoa.perfis WHERE id_usuario = ?', [idUsuario]);
  return linhas.map((l) => l.papel);
}

// Papel principal quando há mais de um: gestão primeiro.
export const PRECEDENCIA = ['Administrador', 'Coordenador', 'Professor', 'Aluno'];

export function papelPrincipal(papeis) {
  if (!papeis?.length) return null;
  return PRECEDENCIA.find((p) => papeis.includes(p)) || papeis[0];
}

export async function papelDe(idUsuario) {
  return papelPrincipal(await papeisDe(idUsuario));
}

// Checagem de papel por lista: um usuário pode ser Administrador e Professor ao
// mesmo tempo. Usar isto em vez de `user.papel === 'X'` para não perder um papel.
export function temPapel(user, ...papeis) {
  const doUsuario = Array.isArray(user?.papeis) && user.papeis.length ? user.papeis : [user?.papel];
  return doUsuario.some((p) => papeis.includes(p));
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
