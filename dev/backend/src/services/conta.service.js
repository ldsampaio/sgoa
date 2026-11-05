import 'dotenv/config';
import { criarPapel, papelDoPapelBase, papelPrincipal, papeisDe } from '../models/perfil.model.js';
import * as AlunoModel from '../models/aluno.model.js';
import * as ProfessorModel from '../models/professor.model.js';

// O sgoa não autentica credencial e não cadastra usuário: a identidade é do saga.
// O que o sgoa faz é identificar a CONTA do sistema a partir dessa identidade —
// papéis em `sgoa.perfis` e entidade em `sgoa.alunos` / `sgoa.professores`. Sem isto
// o usuário logado entra e não encontra conta carregada.
//
// Só ALUNO e PROFESSOR são deriváveis de `role_base`. Coordenador e Administrador
// continuam sendo atribuídos pela gestão — com uma exceção decidida aqui: o admin do
// sistema (`INITIAL_ADMIN_LOGIN`), que é Administrador em todos os sistemas.
// Find-or-create: linha existente nunca é sobrescrita, o serviço só cria quando falta.
const ENTIDADES_DO_PAPEL = { Aluno: AlunoModel, Professor: ProfessorModel };

export function loginDoAdmin(env = process.env) {
  return String(env.INITIAL_ADMIN_LOGIN || 'ldsampaio').toLowerCase().trim();
}

export async function identificarConta(idUsuario, roleBase, deps = {}) {
  const papeisDeFn = deps.papeisDe || papeisDe;
  const criarPapelFn = deps.criarPapel || criarPapel;
  const entidades = deps.entidades || ENTIDADES_DO_PAPEL;
  const admin = String(deps.adminLogin || loginDoAdmin()).toLowerCase();
  const login = String(deps.login || '').toLowerCase();

  const registrados = await papeisDeFn(idUsuario);
  const novos = [];

  if (login && login === admin && !registrados.includes('Administrador')) novos.push('Administrador');

  const derivado = papelDoPapelBase(roleBase);
  // Deriva só quando não há papel registrado — ou quando é o admin, que é
  // Administrador e Professor. Para quem tem papel atribuído pela gestão, não se
  // inventa papel.
  if (derivado !== 'UNDEFINIDO' && !registrados.includes(derivado) && (!registrados.length || login === admin)) {
    novos.push(derivado);
  }

  for (const papel of novos) await criarPapelFn(idUsuario, papel);

  const papeis = [...registrados, ...novos];
  const principal = papelPrincipal(papeis);

  // Entidade do papel que tem entidade (Administrador e Coordenador não têm).
  let conta = null;
  for (const papel of [principal, ...papeis]) {
    const modelo = entidades[papel];
    if (!modelo) continue;
    conta = (await modelo.findByUsuario(idUsuario)) || (await modelo.criar({ idUsuario }));
    break;
  }

  return { papel: principal, papeis, conta };
}
