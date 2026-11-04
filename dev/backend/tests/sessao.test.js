import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import jwt from 'jsonwebtoken';
import jwks from 'jwks-rsa';

import { criarMiddlewareAuth } from '../src/middleware/auth.js';
import { rejeitaCredencial } from '../src/middleware/rejeitaCredencial.js';
import { SCHEMA } from '../src/config/database.js';
import authRoutes from '../src/routes/auth.routes.js';
import { decidirAcao } from '../../frontend/src/plugins/decisaoErro.js';

// Wiring do middleware + caminhos do frontend, exercitado com fakes em memória
// (Redis e repositório). O JWKS usa o cliente real (jwks-rsa) com cache por `kid`
// ativo: é o único cache permitido pelo contrato, e ele nunca concede acesso
// sozinho — sem heartbeat a resposta continua 503.
const ENV = {
  SAGA_LOGIN_URL: 'http://localhost:8000/login',
  SAGA_JWKS_URL: 'http://localhost:8000/.well-known/jwks.json',
  PORTAL_ALLOWED_REDIRECT_HOSTS: 'localhost',
};

const CHAVES = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const OUTRA_CHAVE = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const JWK = { ...CHAVES.publicKey.export({ format: 'jwk' }), kid: 'saga-1', alg: 'ES256', use: 'sig' };

const clienteJwks = jwks({
  jwksUri: ENV.SAGA_JWKS_URL,
  getKeysInterceptor: async () => [JWK],
  cache: true,
});
const resolverChave = async (kid) => (await clienteJwks.getSigningKey(kid)).getPublicKey();

function fakeRedis({ heartbeat = '1' } = {}) {
  const estado = { heartbeat, meta: new Map() };
  return {
    setHeartbeat(valor) {
      estado.heartbeat = valor;
    },
    setMeta(sid, hash) {
      estado.meta.set(`saga:sess:${sid}:meta`, hash);
    },
    revoke(sid) {
      estado.meta.delete(`saga:sess:${sid}:meta`);
    },
    async get(chave) {
      return chave === 'saga:heartbeat' ? estado.heartbeat : null;
    },
    async hgetall(chave) {
      return estado.meta.get(chave) || {};
    },
  };
}

function fakeRepositorio(papeis) {
  return async (idUsuario) => papeis.get(idUsuario) || null;
}

function requisicao(cookie, host = 'localhost') {
  return {
    headers: { cookie: cookie ? `saga_session=${cookie}` : '', host },
    originalUrl: '/api/auth/me',
    protocol: 'http',
  };
}

function respostaCapturada() {
  const captura = { status: 0, body: null, headers: {} };
  const res = {
    // Express: `res.set` é chamado no objeto, antes de `res.status(...)`.
    set: (chave, valor) => {
      captura.headers[chave] = valor;
      return res;
    },
    status: (codigo) => {
      captura.status = codigo;
      return {
        json: (corpo) => {
          captura.body = corpo;
        },
      };
    },
    captura,
  };
  return res;
}

function tokenDe(payload, chave = CHAVES.privateKey, kid = 'saga-1') {
  return jwt.sign(payload, chave, { algorithm: 'ES256', keyid: kid, expiresIn: '1h' });
}

function sessaoViva(redis, { sid = 'sid-0001', user = 'u1', login = 'a234561' } = {}) {
  redis.setMeta(sid, {
    user_id: user,
    login,
    name: 'Ana',
    email: 'ana@utfpr.edu.br',
    role_base: 'ALUNO',
    gen: '1',
    created_at: '2026-11-04T00:00:00Z',
    last_seen_at: '2026-11-04T00:00:00Z',
  });
  return tokenDe({ iss: 'saga', sub: user, sid, gen: 1 });
}

// ── Falha fechada: heartbeat ──────────────────────────────────────────────────

test('heartbeat ausente → 503 mesmo com JWT válido e JWKS cacheado', async () => {
  const redis = fakeRedis();
  const middleware = criarMiddlewareAuth({ redis, resolverChave, papelDe: fakeRepositorio(new Map([['u1', 'Aluno']])), env: ENV });
  const token = sessaoViva(redis);

  // Popula o cache de chave (único cache permitido) e confirma que o acesso passa
  // enquanto o heartbeat existe.
  await resolverChave('saga-1');
  let passou = false;
  await middleware(requisicao(token), respostaCapturada(), () => {
    passou = true;
  });
  assert.ok(passou, 'com heartbeat o acesso passa');

  redis.setHeartbeat(null);
  const res = respostaCapturada();
  await middleware(requisicao(token), res, () => {});

  assert.equal(res.captura.status, 503);
  assert.equal(res.captura.body.code, 'IDENTITY_UNAVAILABLE');
  assert.equal(res.captura.body.retry_after, 30);
  assert.equal(res.captura.headers['Retry-After'], '30');
  assert.ok(!('login_url' in res.captura.body), '503 não pode trazer login_url');
});

// ── 401 e 503 são caminhos distintos no frontend ─────────────────────────────

test('503 não dispara redirect; 401 dispara com o login_url do corpo', async () => {
  const acao503 = decidirAcao(503, { code: 'IDENTITY_UNAVAILABLE', retry_after: 30 });
  assert.equal(acao503.tipo, 'pagina');
  assert.equal(acao503.rota, 'indisponivel');
  assert.ok(!acao503.url, '503 não produz redirect — não se redireciona para o serviço que caiu');

  const acao401 = decidirAcao(401, { code: 'SESSION_DEAD', login_url: 'http://localhost:8000/login?redirect=%2Fdashboard' });
  assert.equal(acao401.tipo, 'redirect');
  assert.equal(acao401.url, 'http://localhost:8000/login?redirect=%2Fdashboard');

  // Confundir os dois faria o usuário voltar para um login que também está fora.
  assert.notEqual(acao503.tipo, acao401.tipo);
});

// ── T10 ───────────────────────────────────────────────────────────────────────

const SENHA = 'SenhaQueNuncaDeveAparecer-9!';

test('nenhuma rota aceita campo senha', () => {
  const res = respostaCapturada();
  let passou = false;
  rejeitaCredencial({ body: { login: 'a234561', senha: SENHA } }, res, () => {
    passou = true;
  });
  assert.equal(res.captura.status, 400);
  assert.equal(res.captura.body.code, 'CREDENCIAL_NAO_ACEITA');
  assert.equal(passou, false);
  assert.ok(!JSON.stringify(res.captura.body).includes(SENHA), 'a resposta não repete o valor recebido');

  const ok = respostaCapturada();
  let deixouPassar = false;
  rejeitaCredencial({ body: { nome: 'Ana' } }, ok, () => {
    deixouPassar = true;
  });
  assert.ok(deixouPassar);
});

test('a rota de auth é só GET /api/auth/me', () => {
  const rotas = authRoutes.stack
    .filter((camada) => camada.route)
    .map((camada) => `${Object.keys(camada.route.methods)[0].toUpperCase()} ${camada.route.path}`);
  assert.deepEqual(rotas, ['GET /me']);
});

test('coluna de senha não existe no schema do sgoa', () => {
  const proibidos = ['senha_hash', 'senha', 'password', 'recuperacoes_senha'];
  for (const termo of proibidos) {
    assert.ok(!SCHEMA.toLowerCase().includes(termo), `schema contém "${termo}"`);
  }
  assert.ok(!/CREATE TABLE IF NOT EXISTS sgoa\.usuarios/.test(SCHEMA), 'usuarios deixou de existir');
  assert.ok(/REFERENCES auth\.users/.test(SCHEMA), 'as tabelas do sgoa referenciam auth.users');
});

test('o token de sessão nunca é escrito em log', async () => {
  const redis = fakeRedis();
  const middleware = criarMiddlewareAuth({ redis, resolverChave, papelDe: fakeRepositorio(new Map()), env: ENV });
  const token = sessaoViva(redis);

  const original = { log: console.log, error: console.error, warn: console.warn };
  const saida = [];
  const capturar = (...args) => saida.push(args.join(' '));
  console.log = capturar;
  console.error = capturar;
  console.warn = capturar;
  try {
    const res = respostaCapturada();
    await middleware(requisicao(token), res, () => {});
    assert.ok(!JSON.stringify(res.captura.body).includes(token), 'a resposta não ecoa o token');
  } finally {
    console.log = original.log;
    console.error = original.error;
    console.warn = original.warn;
  }

  assert.ok(!saida.some((linha) => linha.includes(token)), 'o token apareceu em log');
  assert.ok(!saida.some((linha) => linha.includes('sid-0001')), 'o sid apareceu em log');
});

test('erro de autenticação não revela se o login existe', async () => {
  const redis = fakeRedis();
  const middleware = criarMiddlewareAuth({ redis, resolverChave, papelDe: fakeRepositorio(new Map()), env: ENV });

  const semSessao = respostaCapturada();
  await middleware(requisicao(''), semSessao, () => {});
  assert.deepEqual(Object.keys(semSessao.captura.body).sort(), ['code', 'login_url', 'message']);

  // Login que existe no banco e login que não existe produzem a mesma frase.
  const existe = sessaoViva(redis, { sid: 'sid-0002', user: 'u1', login: 'a234561' });
  redis.revoke('sid-0002');
  const morto = respostaCapturada();
  await middleware(requisicao(existe), morto, () => {});

  const inexistente = respostaCapturada();
  await middleware(requisicao(tokenDe({ iss: 'saga', sub: 'u9', sid: 'sid-0003', gen: 1 })), inexistente, () => {});

  assert.equal(morto.captura.status, 401);
  assert.equal(inexistente.captura.status, 401);
  assert.equal(morto.captura.body.message, inexistente.captura.body.message);
  assert.ok(!JSON.stringify(morto.captura.body).includes('a234561'), 'a resposta não revela o login');
  assert.ok(!JSON.stringify(inexistente.captura.body).includes('u9'), 'a resposta não revela o usuário');
});
