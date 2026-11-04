import { criarPapel, papelDe, papelDoPapelBase } from '../models/perfil.model.js';
import * as AlunoModel from '../models/aluno.model.js';
import * as ProfessorModel from '../models/professor.model.js';

// O sgoa não autentica credencial e não cadastra usuário: a identidade é do saga.
// O que o sgoa faz é identificar a CONTA do sistema a partir dessa identidade —
// papel em `sgoa.perfis` e entidade em `sgoa.alunos` / `sgoa.professores`. Sem isto
// o usuário logado entra e não encontra conta nenhuma carregada.
//
// Só ALUNO e PROFESSOR são deriváveis de `role_base`. Coordenador e Administrador
// continuam sendo atribuídos pela gestão: aqui não se inventa papel.
const ENTIDADES_DO_PAPEL = { Aluno: AlunoModel, Professor: ProfessorModel };

// Find-or-create. A linha existente manda — o serviço só cria quando não há conta.
export async function identificarConta(idUsuario, roleBase, deps = {}) {
  const papelDeFn = deps.papelDe || papelDe;
  const criarPapelFn = deps.criarPapel || criarPapel;
  const entidades = deps.entidades || ENTIDADES_DO_PAPEL;

  let papel = await papelDeFn(idUsuario);
  if (!papel) {
    papel = papelDoPapelBase(roleBase);
    if (papel === 'UNDEFINIDO') return { papel: null, conta: null };
    await criarPapelFn(idUsuario, papel);
  }

  const modelo = entidades[papel];
  if (!modelo) return { papel, conta: null };

  const conta = (await modelo.findByUsuario(idUsuario)) || (await modelo.criar({ idUsuario }));
  return { papel, conta };
}
