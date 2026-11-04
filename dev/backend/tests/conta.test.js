import test from 'node:test';
import assert from 'node:assert/strict';

import { identificarConta } from '../src/services/conta.service.js';

// Regressão: o usuário logado no saga entra no sgoa e não encontra conta carregada.
// A identidade é do saga; o que o sgoa tem é a CONTA do sistema — papel em
// `sgoa.perfis` e entidade em `sgoa.alunos` / `sgoa.professores`. Sem estas linhas
// `perfil.id_aluno` / `perfil.id_professor` ficam null e nada do sistema se monta
// em torno do usuário.
//
// Fakes injetáveis: o serviço é o único ponto que decide o que criar, e é isso que
// estes testes exercitam — sem banco.

function fakePapelDe(papeis) {
  return async (idUsuario) => papeis.get(idUsuario) || null;
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

test('sem conta no sgoa, o papel do role_base deriva a conta', async () => {
  const perfis = new Map();
  const alunos = new Map();
  const criados = [];

  const resultado = await identificarConta('u1', 'ALUNO', {
    papelDe: fakePapelDe(perfis),
    criarPapel: async (idUsuario, papel) => {
      criados.push([idUsuario, papel]);
      perfis.set(idUsuario, papel);
      return { id_usuario: idUsuario, papel };
    },
    entidades: { Aluno: fakeEntidade(alunos) },
  });

  assert.equal(resultado.papel, 'Aluno');
  assert.deepEqual(criados, [['u1', 'Aluno']], 'papel criado a partir do role_base');
  assert.ok(resultado.conta, 'entidade do aluno criada');
  assert.equal(resultado.conta.id_usuario, 'u1');
});

test('PROFESSOR deriva a conta de professor', async () => {
  const professores = new Map();
  const resultado = await identificarConta('u2', 'PROFESSOR', {
    papelDe: fakePapelDe(new Map()),
    criarPapel: async (idUsuario, papel) => ({ id_usuario: idUsuario, papel }),
    entidades: { Professor: fakeEntidade(professores) },
  });

  assert.equal(resultado.papel, 'Professor');
  assert.ok(resultado.conta);
});

test('linha existente manda — o serviço nunca sobrescreve o papel', async () => {
  const perfis = new Map([['u3', 'Coordenador']]);
  let criouPapel = false;

  const resultado = await identificarConta('u3', 'PROFESSOR', {
    papelDe: fakePapelDe(perfis),
    criarPapel: async () => {
      criouPapel = true;
    },
    // Coordenador não é derivável de role_base: atribuição é da gestão.
    entidades: {},
  });

  assert.equal(resultado.papel, 'Coordenador', 'papel registrado não é substituído');
  assert.equal(criouPapel, false, 'não se inventa papel quando já existe linha');
  assert.equal(resultado.conta, null, 'sem entidade para este papel');
});

test('UNDEFINIDO não inventa papel nem conta', async () => {
  let criouPapel = false;
  const resultado = await identificarConta('u4', 'UNDEFINIDO', {
    papelDe: fakePapelDe(new Map()),
    criarPapel: async () => {
      criouPapel = true;
    },
    entidades: {},
  });

  assert.equal(resultado.papel, null);
  assert.equal(resultado.conta, null);
  assert.equal(criouPapel, false);
});

test('conta existente não é duplicada', async () => {
  const alunos = new Map([['u5', { id_entidade: 'existente', id_usuario: 'u5' }]]);
  const resultado = await identificarConta('u5', 'ALUNO', {
    papelDe: fakePapelDe(new Map([['u5', 'Aluno']])),
    criarPapel: async () => null,
    entidades: { Aluno: fakeEntidade(alunos) },
  });

  assert.equal(resultado.conta.id_entidade, 'existente');
  assert.equal(alunos.size, 1, 'uma conta por usuário');
});
