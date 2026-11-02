import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizarUrlOverleaf,
  normalizarCategoria,
  normalizarEstado,
  normalizarObservacao,
  hostsPermitidos,
} from '../src/services/enlacesValidacao.js';
import { CATEGORIAS_ENLACE, valoresDoCheck } from '../src/services/enlacesCategorias.js';

function statusDe(fn) {
  try {
    return { ok: true, valor: fn() };
  } catch (err) {
    return { ok: false, status: err.status, mensagem: err.message };
  }
}

test('aceita link da instância institucional', () => {
  const url = normalizarUrlOverleaf('https://overleaf.utfpr.edu.br/project/abc123def');
  assert.equal(url, 'https://overleaf.utfpr.edu.br/project/abc123def');
});

test('rejeita http', () => {
  const r = statusDe(() => normalizarUrlOverleaf('http://overleaf.utfpr.edu.br/project/abc'));
  assert.equal(r.ok, false);
  assert.equal(r.status, 400);
});

test('rejeita outro domínio', () => {
  const r = statusDe(() => normalizarUrlOverleaf('https://www.overleaf.com/project/abc'));
  assert.equal(r.ok, false);
  assert.equal(r.status, 400);
  assert.match(r.mensagem, /overleaf\.utfpr\.edu\.br/);
});

test('rejeita subdomínio (a allowlist não usa wildcard)', () => {
  const r = statusDe(() => normalizarUrlOverleaf('https://lab.overleaf.utfpr.edu.br/project/abc'));
  assert.equal(r.ok, false);
  assert.equal(r.status, 400);
});

test('rejeita URL incompleta', () => {
  const r = statusDe(() => normalizarUrlOverleaf('overleaf.utfpr.edu.br/project/abc'));
  assert.equal(r.ok, false);
  assert.equal(r.status, 400);
});

test('normaliza: host minúsculo, sem fragment, sem barra final', () => {
  const url = normalizarUrlOverleaf('https://Overleaf.utfpr.edu.br/read/ABC123?x=1#topo/');
  assert.equal(url, 'https://overleaf.utfpr.edu.br/read/ABC123?x=1');
});

test('link vazio retorna null (o controller responde 400 antes de gravar)', () => {
  assert.equal(normalizarUrlOverleaf('   '), null);
});

test('OVERLEAF_HOSTS amplia a allowlist', () => {
  process.env.OVERLEAF_HOSTS = 'overleaf.utfpr.edu.br, overleaf.example.edu';
  assert.deepEqual(hostsPermitidos(), ['overleaf.utfpr.edu.br', 'overleaf.example.edu']);
  assert.equal(normalizarUrlOverleaf('https://overleaf.example.edu/project/xyz'), 'https://overleaf.example.edu/project/xyz');
  delete process.env.OVERLEAF_HOSTS;
});

test('categoria usa a forma canônica do enum', () => {
  assert.equal(normalizarCategoria('convalidação'), 'Convalidação');
  assert.equal(normalizarCategoria('TCC1'), 'TCC1');
});

test('categoria fora do enum é rejeitada', () => {
  const r = statusDe(() => normalizarCategoria('Capítulo'));
  assert.equal(r.ok, false);
  assert.equal(r.status, 400);
});

test('status default e inválido', () => {
  assert.equal(normalizarEstado(undefined), 'Vigente');
  assert.equal(normalizarEstado('encerrado'), 'Encerrado');
  const r = statusDe(() => normalizarEstado('Arquivado'));
  assert.equal(r.ok, false);
  assert.equal(r.status, 400);
});

test('observação é cortada e limitada', () => {
  assert.equal(normalizarObservacao('  capítulo 3  '), 'capítulo 3');
  assert.equal(normalizarObservacao(null), null);
  const r = statusDe(() => normalizarObservacao('a'.repeat(600)));
  assert.equal(r.ok, false);
  assert.equal(r.status, 400);
});

test('o CHECK dos dois schemas é gerado do mesmo enum', () => {
  const clause = valoresDoCheck(CATEGORIAS_ENLACE);
  for (const categoria of CATEGORIAS_ENLACE) assert.ok(clause.includes(`'${categoria}'`));
});
