import test from 'node:test';
import assert from 'node:assert/strict';

import { identificarConta, loginDoAdmin } from '../src/services/conta.service.js';

// Regressão: o usuário logado no saga entra no sgoa e não encontra conta carregada.
// A identidade é do saga; o que o sgoa tem é a CONTA do sistema — papéis em
// `sgoa.perfis` e entidade em `sgoa.alunos` / `sgoa.professores`.
//
// Fakes injetáveis: o serviço é o único ponto que decide o que criar, e é isso que
// estes testes exercitam — sem banco.

function fakePapeisDe(papeis) {
  return async (idUsuario) => papeis.get(idUsuario) || [];
}

function fakeEntidade(estado) {
  return {
    async findByUsuario(idUsuario) {
      return estado.get(idUsuario) || null;
    },
    async criar({ idUsuario }) {
      const criada = { id_entidade: `novo-${idUsuario}`, id_usuario: idUsuario };
      estado.set(idUsuario, criada);
      return criada;
    },
  };
}

function ambiente({ papeis = new Map(), entidades = {}, criados = [] } = {}) {
  const linha = (idUsuario) => {
    if (!papeis.has(idUsuario)) papeis.set(idUsuario, []);
    return papeis.get(idUsuario);
  };

  return {
    criados,
    papeisDe: fakePapeisDe(papeis),
    criarPapel: async (idUsuario, papel) => {
      criados.push([idUsuario, papel]);
      linha(idUsuario).push(papel);
      return { id_usuario: idUsuario, papel };
    },
    entidades,
    adminLogin: loginDoAdmin({ INITIAL_ADMIN_LOGIN: 'ldsampaio' }),
  };
}

test('sem conta no sgoa, o papel do role_base deriva a conta', async () => {
  const alunos = new Map();
  const deps = ambiente({ entidades: { Aluno: fakeEntidade(alunos) } });

  const resultado = await identificarConta('u1', 'ALUNO', { ...deps, login: 'a100' });

  assert.deepEqual(resultado.papeis, ['Aluno']);
  assert.equal(resultado.papel, 'Aluno');
  assert.deepEqual(deps.criados, [['u1', 'Aluno']], 'papel criado a partir do role_base');
  assert.ok(resultado.conta, 'entidade do aluno criada');
});

test('linha existente manda — o serviço nunca sobrescreve o papel', async () => {
  const deps = ambiente({ papeis: new Map([['u3', ['Coordenador']]]) });

  const resultado = await identificarConta('u3', 'PROFESSOR', { ...deps, login: 'prof.x' });

  assert.deepEqual(resultado.papeis, ['Coordenador'], 'papel registrado não é substituído');
  assert.equal(deps.criados.length, 0, 'não se inventa papel quando já existe linha');
  assert.equal(resultado.conta, null, 'sem entidade para este papel');
});

test('UNDEFINIDO não inventa papel nem conta', async () => {
  const deps = ambiente();

  const resultado = await identificarConta('u4', 'UNDEFINIDO', { ...deps, login: 'qualquer' });

  assert.equal(resultado.papel, null);
  assert.equal(resultado.conta, null);
  assert.equal(deps.criados.length, 0);
});

test('conta existente não é duplicada', async () => {
  const alunos = new Map([['u5', { id_entidade: 'existente', id_usuario: 'u5' }]]);
  const deps = ambiente({ papeis: new Map([['u5', ['Aluno']]]), entidades: { Aluno: fakeEntidade(alunos) } });

  const resultado = await identificarConta('u5', 'ALUNO', { ...deps, login: 'a100' });

  assert.equal(resultado.conta.id_entidade, 'existente');
  assert.equal(alunos.size, 1, 'uma conta por usuário');
});

test('o admin do sistema é Administrador e mantém o papel derivado', async () => {
  const professores = new Map();
  const deps = ambiente({ entidades: { Professor: fakeEntidade(professores) } });

  const resultado = await identificarConta('u6', 'PROFESSOR', { ...deps, login: 'ldsampaio' });

  // Os dois: Administrador (gestão) e Professor (entidade do sgoa).
  assert.deepEqual(deps.criados, [['u6', 'Administrador'], ['u6', 'Professor']]);
  assert.equal(resultado.papel, 'Administrador', 'gestão tem precedência no papel principal');
  assert.deepEqual(resultado.papeis, ['Administrador', 'Professor']);
  assert.ok(resultado.conta, 'a conta de professor continua sendo a entidade do usuário');
  assert.equal(professores.size, 1);
});

test('admin já registrado não ganha papel duplicado', async () => {
  const deps = ambiente({ papeis: new Map([['u7', ['Administrador', 'Professor']]]) });

  await identificarConta('u7', 'PROFESSOR', { ...deps, login: 'Ldsampaio' });

  assert.equal(deps.criados.length, 0, 'UNIQUE (id_usuario, papel) não aceita repetição');
});
