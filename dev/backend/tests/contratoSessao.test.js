import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import jwt from 'jsonwebtoken';

import { criarVerificador, lerCookie, montarLoginUrl } from '../src/services/sessionVerifier.js';
import { rejeitaCredencial } from '../src/middleware/rejeitaCredencial.js';
import { SCHEMA } from '../src/config/database.js';

// ── Fakes ────────────────────────────────────────────────────────────────────

// Redis em memória com a mesma forma mínima que o verifier usa (get + hgetall).
// Sem cache de sessão em processo: cada chamada vai ao Redis.
class RedisFake {
  constructor() {
    this.chaves = new Map();
  }

  async get(chave) {
    return this.chaves.get(chave) ?? null;
  }

  async hgetall(chave) {
    const valor = this.chaves.get(chave);
    return valor && typeof valor === 'object' ? { ...valor } : {};
  }

  set(chave, valor) {
    this.chaves.set(chave, valor);
  }

  del(chave) {
    this.chaves.delete(chave);
  }
}

// Resolver de chave "cacheado": devolve a chave pública sem rede. Serve para
// provar que cache de chave NUNCA concede acesso sozinho — sem heartbeat, a
// resposta continua 503 mesmo com a chave disponível.
function resolverDeChaveCacheada(publicKey, kidConhecido = 'saga-1') {
  const cache = new Map();
  return async function resolver(kid) {
    if (kid !== kidConhecido) throw new Error(`kid desconhecido: ${kid}`);
    if (!cache.has(kid)) cache.set(kid, publicKey);
    return cache.get(kid);
  };
}

const CHAVES = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const OUTRA_CHAVE = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });

function tokenDe(payload, chave = CHAVES.privateKey, kid = 'saga-1') {
  return jwt.sign(payload, chave, { algorithm: 'ES256', keyid: kid });
}

function requisicao(cookie, headers = {}) {
  return {
    headers: { cookie, host: 'localhost:5173', ...headers },
    protocol: 'http',
    originalUrl: '/api/auth/me',
  };
}

function ambienteBase({ redis, papeis = [] } = {}) {
  return {
    redis: redis || new RedisFake(),
    resolverChave: resolverDeChaveCacheada(CHAVES.publicKey),
    papeisDe: async () => papeis,
    env: {
      SAGA_LOGIN_URL: 'http://localhost:8000/login',
      SAGA_JWKS_URL: 'http://localhost:8000/.well-known/jwks.json',
      PORTAL_ALLOWED_REDIRECT_HOSTS: 'localhost',
      IDENTITY_RETRY_AFTER: 30,
    },
  };
}

// ── 1. Falha fechada: sem heartbeat, 503 mesmo com token válido ──────────────

test('heartbeat ausente → 503 mesmo com JWT válido e JWKS cacheado', async () => {
  const redis = new RedisFake();
  redis.set('saga:sess:sid-0001:meta', { user_id: 'u1', login: 'a234561', role_base: 'ALUNO', gen: '1' });
  const token = tokenDe({ iss: 'saga', sub: 'u1', sid: 'sid-0001', gen: 1, role: 'ALUNO' });

  const resultado = await criarVerificador(ambienteBase({ redis }))(requisicao(`saga_session=${token}`));

  assert.ok(!resultado.ok);
  assert.equal(resultado.status, 503);
  assert.equal(resultado.body.code, 'IDENTITY_UNAVAILABLE');
  assert.equal(resultado.headers['Retry-After'], '30');
  // A chave estava no cache e o token estava bem assinado: ainda assim negou.
  assert.ok(await resolverDeChaveCacheada(CHAVES.publicKey)('saga-1'));
});

test('Redis inacessível → 503, sem fallback', async () => {
  const redis = {
    get: async () => {
      throw new Error('connection refused');
    },
    hgetall: async () => {
      throw new Error('connection refused');
    },
  };
  const token = tokenDe({ iss: 'saga', sub: 'u1', sid: 'sid-0001', gen: 1 });
  const resultado = await criarVerificador(ambienteBase({ redis }))(requisicao(`saga_session=${token}`));
  assert.equal(resultado.status, 503);
  assert.equal(resultado.body.code, 'IDENTITY_UNAVAILABLE');
});

// ── 2. 401: caminhos de sessão ───────────────────────────────────────────────

test('sem cookie → 401 NO_SESSION com login_url', async () => {
  const redis = new RedisFake();
  redis.set('saga:heartbeat', '1');
  const resultado = await criarVerificador(ambienteBase({ redis }))(requisicao(''));
  assert.equal(resultado.status, 401);
  assert.equal(resultado.body.code, 'NO_SESSION');
  assert.ok(resultado.body.login_url.startsWith('http://localhost:8000/login'));
});

test('assinatura inválida → 401 BAD_TOKEN', async () => {
  const redis = new RedisFake();
  redis.set('saga:heartbeat', '1');
  redis.set('saga:sess:sid-0002:meta', { user_id: 'u1', gen: '1' });
  const forjado = tokenDe({ iss: 'saga', sub: 'u1', sid: 'sid-0002', gen: 1 }, OUTRA_CHAVE.privateKey);
  const resultado = await criarVerificador(ambienteBase({ redis }))(requisicao(`saga_session=${forjado}`));
  assert.equal(resultado.status, 401);
  assert.equal(resultado.body.code, 'BAD_TOKEN');
});

test('token expirado → 401 BAD_TOKEN', async () => {
  const redis = new RedisFake();
  redis.set('saga:heartbeat', '1');
  const expirado = jwt.sign(
    { iss: 'saga', sub: 'u1', sid: 'sid-0003', gen: 1 },
    CHAVES.privateKey,
    { algorithm: 'ES256', keyid: 'saga-1', expiresIn: '-1s' },
  );
  const resultado = await criarVerificador(ambienteBase({ redis }))(requisicao(`saga_session=${expirado}`));
  assert.equal(resultado.status, 401);
  assert.equal(resultado.body.code, 'BAD_TOKEN');
});

test('kid desconhecido → 401 BAD_TOKEN', async () => {
  const redis = new RedisFake();
  redis.set('saga:heartbeat', '1');
  const resultado = await criarVerificador(ambienteBase({ redis }))(
    requisicao(`saga_session=${tokenDe({ iss: 'saga', sub: 'u1', sid: 'sid-0004', gen: 1 }, CHAVES.privateKey, 'kid-desconhecido')}`),
  );
  assert.equal(resultado.status, 401);
  assert.equal(resultado.body.code, 'BAD_TOKEN');
});

test('sessão revogada no Redis → 401 SESSION_DEAD', async () => {
  const redis = new RedisFake();
  redis.set('saga:heartbeat', '1');
  redis.set('saga:sess:sid-0005:meta', { user_id: 'u1', login: 'a1', role_base: 'ALUNO', gen: '1' });
  const token = tokenDe({ iss: 'saga', sub: 'u1', sid: 'sid-0005', gen: 1 });
  const verifier = criarVerificador(ambienteBase({ redis }));

  const antes = await verifier(requisicao(`saga_session=${token}`));
  assert.equal(antes.ok, true);

  redis.del('saga:sess:sid-0005:meta'); // revogação: o saga apagou a chave
  const depois = await verifier(requisicao(`saga_session=${token}`));
  assert.equal(depois.status, 401);
  assert.equal(depois.body.code, 'SESSION_DEAD');
});

test('gen divergente → 401 SESSION_STALE', async () => {
  const redis = new RedisFake();
  redis.set('saga:heartbeat', '1');
  redis.set('saga:sess:sid-0006:meta', { user_id: 'u1', gen: '2' });
  const resultado = await criarVerificador(ambienteBase({ redis }))(
    requisicao(`saga_session=${tokenDe({ iss: 'saga', sub: 'u1', sid: 'sid-0006', gen: 1 })}`),
  );
  assert.equal(resultado.status, 401);
  assert.equal(resultado.body.code, 'SESSION_STALE');
});

// ── 3. 401 e 503 são caminhos distintos ──────────────────────────────────────

test('503 não carrega login_url: o frontend não redireciona para o serviço que caiu', async () => {
  const resultado = await criarVerificador(ambienteBase({ redis: new RedisFake() }))(
    requisicao(`saga_session=${tokenDe({ iss: 'saga', sub: 'u1', sid: 'sid-0007', gen: 1 })}`),
  );
  assert.equal(resultado.status, 503);
  assert.ok(!('login_url' in resultado.body));
  assert.equal(
    resultado.body.message,
    'Não foi possível confirmar sua identidade. Acesso negado. O serviço de autenticação não está respondendo.',
  );
});

test('401 carrega login_url para o redirect do frontend', async () => {
  const redis = new RedisFake();
  redis.set('saga:heartbeat', '1');
  const resultado = await criarVerificador(ambienteBase({ redis }))(
    requisicao(`saga_session=${tokenDe({ iss: 'saga', sub: 'u1', sid: 'sid-0008', gen: 1 })}`),
  );
  assert.equal(resultado.status, 401);
  assert.ok(resultado.body.login_url);
});

test('redirect só entra na login_url quando o host está na allowlist', () => {
  const env = { SAGA_LOGIN_URL: 'http://localhost:8000/login', PORTAL_ALLOWED_REDIRECT_HOSTS: 'localhost' };
  assert.equal(montarLoginUrl({ headers: { host: 'evil.example.com' } }, env), 'http://localhost:8000/login');
  assert.ok(montarLoginUrl({ headers: { host: 'localhost:5173' } }, env).includes('?redirect='));
});

// ── 4. req.user vem do Redis, papel do sistema ───────────────────────────────

test('req.user vem do Redis e o papel vem da tabela do sgoa, não do claim role', async () => {
  const redis = new RedisFake();
  redis.set('saga:heartbeat', '1');
  redis.set('saga:sess:sid-0009:meta', {
    user_id: 'u1',
    login: 'a234561',
    name: 'Ana',
    email: 'ana@utfpr.edu.br',
    role_base: 'ALUNO',
    gen: '1',
  });
  // Claim `role` do JWT diz outra coisa — o contrato ignora o claim.
  const resultado = await criarVerificador(ambienteBase({ redis, papeis: ['Coordenador'] }))(
    requisicao(`saga_session=${tokenDe({ iss: 'saga', sub: 'u1', sid: 'sid-0009', gen: 1, role: 'PROFESSOR' })}`),
  );
  assert.equal(resultado.ok, true);
  assert.equal(resultado.user.id, 'u1');
  assert.equal(resultado.user.login, 'a234561');
  assert.equal(resultado.user.papel, 'Coordenador');
  assert.deepEqual(resultado.user.papeis, ['Coordenador']);
});

// ── 5. T10 — nenhuma credencial em corpo, schema, log ou erro ────────────────

const SENHA = 'SenhaQueNuncaDeveAparecer-9!';

function respostaCapturada() {
  const captura = { status: 0, body: null };
  return {
    status: (codigo) => {
      captura.status = codigo;
      return { json: (corpo) => { captura.body = corpo; } };
    },
    captura,
  };
}

test('nenhuma rota aceita campo senha', () => {
  const res = respostaCapturada();
  let chamadoNext = false;
  rejeitaCredencial({ body: { login: 'a234561', password: SENHA } }, res, () => { chamadoNext = true; });
  assert.equal(res.captura.status, 400);
  assert.equal(res.captura.body.code, 'CREDENCIAL_NAO_ACEITA');
  assert.equal(chamadoNext, false);
  assert.ok(!JSON.stringify(res.captura.body).includes(SENHA)); // não ecoa o valor
});

test('coluna de senha não existe no schema do sgoa', () => {
  const proibidas = ['senha_hash', 'senha', 'password_hash', 'password', 'recuperacoes_senha'];
  for (const termo of proibidas) {
    assert.ok(!SCHEMA.toLowerCase().includes(termo), `schema contém "${termo}"`);
  }
});

test('o token de sessão nunca é escrito em log', async () => {
  const redis = new RedisFake();
  redis.set('saga:heartbeat', '1');
  redis.set('saga:sess:sid-0010:meta', { user_id: 'u1', login: 'a1', role_base: 'ALUNO', gen: '1' });
  const token = tokenDe({ iss: 'saga', sub: 'u1', sid: 'sid-0010', gen: 1 });

  const original = console.log;
  const saida = [];
  console.log = (...args) => saida.push(args.join(' '));
  try {
    await criarVerificador(ambienteBase({ redis }))(requisicao(`saga_session=${token}`));
  } finally {
    console.log = original;
  }
  const registrado = saida.join('\n');
  assert.ok(!registrado.includes(token), 'token apareceu em log');
  assert.ok(!registrado.includes('sid-0010'), 'sid apareceu em log');
});

test('erro de autenticação não revela se o login existe', async () => {
  const redis = new RedisFake();
  redis.set('saga:heartbeat', '1');

  const existe = await criarVerificador(ambienteBase({ redis }))(requisicao(''));
  const naoExiste = await criarVerificador(ambienteBase({ redis }))(requisicao(''));
  assert.deepEqual(existe.body, naoExiste.body);

  // Sessão morta e login inexistente produzem a mesma frase: nada na resposta
  // diz se o login existe no banco.
  const verifier = criarVerificador(ambienteBase({ redis }));
  redis.set('saga:sess:sid-0011:meta', { user_id: 'u1', login: 'a1', gen: '1' });
  redis.del('saga:sess:sid-0011:meta');
  const morto = await verifier(requisicao(`saga_session=${tokenDe({ iss: 'saga', sub: 'u1', sid: 'sid-0011', gen: 1 })}`));
  const inexistente = await verifier(requisicao(`saga_session=${tokenDe({ iss: 'saga', sub: 'u2', sid: 'sid-0012', gen: 1 })}`));
  assert.equal(morto.status, 401);
  assert.equal(morto.body.code, 'SESSION_DEAD');
  assert.equal(morto.body.message, inexistente.body.message);
  assert.ok(!JSON.stringify(morto.body).includes('a1'));
});

test('lerCookie não confunde cookie de sessão com outro cookie', () => {
  const req = { headers: { cookie: 'outro=1; saga_session=abc; mais=2' } };
  assert.equal(lerCookie(req, 'saga_session'), 'abc');
});

// Regression: o cliente node-redis v6 expõe `hGetAll` (camelCase). O port chamava
// `hgetall`, que não existe no cliente real — o TypeError era tratado como
// "liveness não confirmada" e o verifier respondia 503 em ambiente real, mesmo com
// sessão válida. O teste usa um fake com a forma do cliente real.
test('portRedis delega hgetall para o método real do cliente (hGetAll)', async () => {
  const { portRedis } = await import('../src/config/redis.js');

  const clienteReal = {
    // node-redis v6: só hGetAll existe; hgetall não é função.
    hGetAll: async (chave) => ({ user_id: 'u1', gen: '1', login: 'a234561' }),
    get: async (chave) => '1',
  };

  const port = portRedis(async () => clienteReal);
  const meta = await port.hgetall('saga:sess:sid-0013:meta');
  assert.equal(meta.user_id, 'u1');
  assert.equal(await port.get('saga:heartbeat'), '1');
});

// Contrato, passo 3: o `sid` é opaco e o charset é restrito. Sem isso, um `sid` vindo do
// token construiria o nome da chave Redis (ex.: `*`, newline) e o verifier leria outra
// sessão. Mesma regra do sgrf.
test('sid com charset inesperado não monta chave Redis (BAD_TOKEN)', async () => {
  const redis = new RedisFake();
  redis.set('saga:heartbeat', '1');

  const sid = 'sid-0001*;meta';
  redis.set(`saga:sess:${sid}:meta`, { user_id: 'u1', gen: '1', login: 'a234561' });

  const verifier = criarVerificador(ambienteBase({ redis }));
  const r = await verifier(requisicao(`saga_session=${tokenDe({ iss: 'saga', sub: 'u1', sid, gen: 1 })}`));

  assert.equal(r.status, 401);
  assert.equal(r.body.code, 'BAD_TOKEN');
});
