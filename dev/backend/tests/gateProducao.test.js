import test from 'node:test';
import assert from 'node:assert/strict';
import { CHAVES_GATE, ofensoresDoGate, validaGateProducao } from '../src/config/gateProducao.js';

// Espelho do gate SEC-02 do sgrf. O sgoa não autentica credencial: não há segredo de JWT
// próprio, cookie próprio ou senha de admin. O que o gate protege é o acesso ao Redis
// compartilhado (ACL read-only) e as URLs do saga.

const PRODUCAO_OK = {
  NODE_ENV: 'production',
  REDIS_URL: 'redis://saga_readonly:senha-forte-aleatoria@redis:6379/0',
  SAGA_JWKS_URL: 'https://saga.utfpr.edu.br/.well-known/jwks.json',
  SAGA_LOGIN_URL: 'https://saga.utfpr.edu.br/login',
  PORTAL_ALLOWED_REDIRECT_HOSTS: 'sgoa.utfpr.edu.br',
};

test('SEC-02: produção recusa boot com placeholders e nomeia cada ofensor', () => {
  const env = {
    NODE_ENV: 'production',
    REDIS_URL: 'redis://saga_readonly:change-me@redis:6379/0',
    SAGA_JWKS_URL: 'change-me',
    SAGA_LOGIN_URL: '',
    PORTAL_ALLOWED_REDIRECT_HOSTS: '',
  };

  assert.throws(() => validaGateProducao(env), (err) => {
    assert.match(err.message, /SEC-02: Production boot refused/);
    for (const chave of CHAVES_GATE) {
      assert.ok(err.message.includes(chave), `a mensagem deveria nomear ${chave}`);
    }
    // Nenhum valor secreto aparece na mensagem — só nomes de variáveis.
    assert.ok(!err.message.includes('change-me@redis'), 'a mensagem não pode reproduzir o valor');
    return true;
  });
});

test('SEC-02: produção exige o usuário ACL saga_readonly no REDIS_URL', () => {
  const env = { ...PRODUCAO_OK, REDIS_URL: 'redis://saga_admin:senha-forte@redis:6379/0' };
  assert.deepEqual(ofensoresDoGate(env), ['REDIS_URL (ACL)']);
  assert.throws(() => validaGateProducao(env), /REDIS_URL \(ACL\)/);
});

test('SEC-02: produção com valores corretos passa', () => {
  assert.deepEqual(ofensoresDoGate(PRODUCAO_OK), []);
  assert.equal(validaGateProducao(PRODUCAO_OK), null);
});

test('Fora de produção o gate não dispara (defaults de dev carregam)', () => {
  const dev = {
    NODE_ENV: 'development',
    REDIS_URL: 'redis://saga_readonly:saga-dev-ro@localhost:6379/0',
    SAGA_JWKS_URL: 'http://localhost:8000/.well-known/jwks.json',
    SAGA_LOGIN_URL: 'http://localhost:8000/login',
    PORTAL_ALLOWED_REDIRECT_HOSTS: 'localhost',
  };
  assert.equal(validaGateProducao(dev), null);
  // Valores inseguros fora de produção: não bloqueia o desenvolvimento.
  assert.equal(validaGateProducao({ ...dev, NODE_ENV: 'test', SAGA_LOGIN_URL: '' }), null);
});
