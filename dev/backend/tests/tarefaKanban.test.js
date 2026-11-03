import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizarTitulo,
  normalizarDescricao,
  normalizarPrioridade,
  normalizarCor,
  normalizarStatus,
  normalizarOrdem,
} from '../src/services/tarefaValidacao.js';
import { podeArquivarTarefa } from '../src/services/tarefaPermissoes.js';

function capturarErro(fn) {
  try {
    fn();
  } catch (err) {
    return err;
  }
  assert.fail('esperava erro de validação');
}

test('título: remove espaços e rejeita vazio', () => {
  assert.equal(normalizarTitulo('  Revisar capítulo  '), 'Revisar capítulo');
  const err = capturarErro(() => normalizarTitulo('   '));
  assert.equal(err.status, 400);
  assert.match(err.message, /obrigatório/);
});

test('título: limita a 160 caracteres', () => {
  const err = capturarErro(() => normalizarTitulo('x'.repeat(161)));
  assert.equal(err.status, 400);
  assert.match(err.message, /160/);
});

test('descrição: aceita vazio por padrão e exige quando solicitado', () => {
  assert.equal(normalizarDescricao(''), null);
  const err = capturarErro(() => normalizarDescricao('  ', { obrigatoria: true }));
  assert.equal(err.status, 400);
});

test('prioridade: aplica padrão e rejeita valor fora da lista', () => {
  assert.equal(normalizarPrioridade(undefined), 'Média');
  assert.equal(normalizarPrioridade('Alta'), 'Alta');
  const err = capturarErro(() => normalizarPrioridade('Urgente'));
  assert.equal(err.status, 400);
  assert.match(err.message, /Prioridade inválida/);
});

test('cor: aplica padrão e rejeita valor fora da paleta', () => {
  assert.equal(normalizarCor(undefined), 'branco');
  assert.equal(normalizarCor('menta'), 'menta');
  const err = capturarErro(() => normalizarCor('#ff0000'));
  assert.equal(err.status, 400);
  assert.match(err.message, /Cor inválida/);
});

test('status e ordem: validam os tipos aceitos', () => {
  assert.equal(normalizarStatus('Em Andamento'), 'Em Andamento');
  assert.equal(normalizarOrdem('1.5'), 1.5);
  assert.equal(normalizarOrdem(null), null);
  assert.equal(capturarErro(() => normalizarStatus('Arquivada')).status, 400);
  assert.equal(capturarErro(() => normalizarOrdem('abc')).status, 400);
});

test('arquivamento: criador ou gestão pode arquivar; demais não', () => {
  const tarefa = { id_criador: 'u-1' };
  assert.equal(podeArquivarTarefa({ id_usuario: 'u-1', tipo_usuario: 'Aluno' }, tarefa), true);
  assert.equal(podeArquivarTarefa({ id_usuario: 'u-2', tipo_usuario: 'Aluno' }, tarefa), false);
  assert.equal(podeArquivarTarefa({ id_usuario: 'u-2', tipo_usuario: 'Professor' }, tarefa), true);
  assert.equal(podeArquivarTarefa({ id_usuario: 'u-2', tipo_usuario: 'Coordenador' }, tarefa), true);
  assert.equal(podeArquivarTarefa({ id_usuario: 'u-2', tipo_usuario: 'Administrador' }, tarefa), true);
  assert.equal(podeArquivarTarefa({ id_usuario: 'u-2', tipo_usuario: 'Aluno' }, { id_criador: null }), false);
});
