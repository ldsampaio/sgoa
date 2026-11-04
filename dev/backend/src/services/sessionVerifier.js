import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { resolverChave } from './jwks.js';
import { papelDoPapelBase } from '../models/perfil.model.js';

// Contrato de verificação de sessão (docs/session-contract.md — autoridade,
// não negociável). Ordem exata:
//
//   1. saga:heartbeat ausente        → 503 IDENTITY_UNAVAILABLE (sem fallback)
//   2. cookie saga_session ausente   → 401 NO_SESSION + login_url
//   3. assinatura/exp/kid inválidos  → 401 BAD_TOKEN + login_url
//   4. meta vazio                    → 401 SESSION_DEAD + login_url
//      meta.gen != token.gen         → 401 SESSION_STALE + login_url
//   5. req.user = { id, login, name, email, role_base }  ← do Redis, não do banco
//   6. papel por sistema: sgoa.perfis (nunca o claim `role` do JWT)
//
// Nenhum cache de sessão em processo: só o JWKS é cacheado (por kid), e cache
// de chave nunca concede acesso sozinho.

export const COOKIE_SESSAO = 'saga_session';
export const CHAVE_HEARTBEAT = 'saga:heartbeat';
export const ALGORITMO = 'ES256';
export const EMITISSOR = 'saga';

// `sid` é opaco. Restringir o charset evita montar chave Redis com conteúdo vindo do
// token — mesma regra do sgrf (contrato §4). Sem isso, um `sid` com `*` ou newline
// construiria o nome de chave.
export const SID_RE = /^[A-Za-z0-9_-]{8,64}$/;

// Copy comum dos três sistemas (PLAN §4.1). Não revela estado interno, claims,
// `sid` nem se um login existe.
export const MENSAGEM_INDISPONIVEL =
  'Não foi possível confirmar sua identidade. Acesso negado. O serviço de autenticação não está respondendo.';

const MENSAGEM_SESSAO = 'Não foi possível confirmar sua identidade. Acesso negado.';

export function chaveMeta(sid) {
  return `saga:sess:${sid}:meta`;
}

export function lerCookie(req, nome) {
  const cabecalho = String(req.headers?.cookie || '');
  for (const parte of cabecalho.split(';')) {
    const [chave, ...resto] = parte.trim().split('=');
    if (chave === nome) return resto.join('=') || null;
  }
  return null;
}

function allowlist(env) {
  return String(env.PORTAL_ALLOWED_REDIRECT_HOSTS || '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

// login_url a partir de SAGA_LOGIN_URL. O `redirect` só entra se o host de origem
// estiver na allowlist explícita — sem allowlist, não se monta redirect (open redirect).
export function montarLoginUrl(req, env = process.env) {
  const base = env.SAGA_LOGIN_URL || '';
  const permitidos = allowlist(env);
  const origem = String(req.headers?.host || '').split(':')[0].toLowerCase();
  if (!base || !permitidos.includes(origem)) return base;
  const redirect = req.headers?.referer || `${req.protocol || 'http'}://${req.headers.host}${req.originalUrl || ''}`;
  return `${base}?redirect=${encodeURIComponent(redirect)}`;
}

function indisponivel(retryAfter) {
  return {
    ok: false,
    status: 503,
    headers: { 'Retry-After': String(retryAfter) },
    body: { code: 'IDENTITY_UNAVAILABLE', message: MENSAGEM_INDISPONIVEL, retry_after: retryAfter },
  };
}

function naoAutorizado(code, loginUrl) {
  // A resposta nunca diz se o login existe nem o conteúdo do token.
  return { ok: false, status: 401, body: { code, message: MENSAGEM_SESSAO, login_url: loginUrl } };
}

export function criarVerificador({ redis, resolverChave: resolver = resolverChave, papelDe, env = process.env }) {
  const retryAfter = Number(env.IDENTITY_RETRY_AFTER) || 30;

  return async function verificar(req) {
    // 1. Liveness do saga. Falha fechada: sem confirmação, rejeita — mesmo com
    //    JWT válido e JWKS cacheado.
    let heartbeat = null;
    try {
      heartbeat = await redis.get(CHAVE_HEARTBEAT);
    } catch {
      heartbeat = null;
    }
    if (!heartbeat) return indisponivel(retryAfter);

    // 2. Cookie de sessão.
    const token = lerCookie(req, COOKIE_SESSAO);
    if (!token) return naoAutorizado('NO_SESSION', montarLoginUrl(req, env));

    // 3. Assinatura, exp e kid.
    let payload;
    try {
      const cabecalho = jwt.decode(token, { complete: true });
      if (!cabecalho?.header?.kid) return naoAutorizado('BAD_TOKEN', montarLoginUrl(req, env));
      const chave = await resolver(cabecalho.header.kid, env);
      payload = jwt.verify(token, chave, { algorithms: [ALGORITMO], issuer: env.SAGA_JWT_ISSUER || EMITISSOR });
    } catch {
      return naoAutorizado('BAD_TOKEN', montarLoginUrl(req, env));
    }

    // 3b. charset do `sid` (contrato, passo 3): sem isso o nome da chave Redis sairia do
    //     conteúdo do token.
    if (!SID_RE.test(String(payload.sid))) return naoAutorizado('BAD_TOKEN', montarLoginUrl(req, env));

    // 4. Estado da sessão no Redis. Sem fallback de cache.
    let meta;
    try {
      meta = await redis.hgetall(chaveMeta(payload.sid));
    } catch {
      return indisponivel(retryAfter);
    }
    if (!meta || !Object.keys(meta).length) return naoAutorizado('SESSION_DEAD', montarLoginUrl(req, env));
    if (Number(meta.gen) !== Number(payload.gen)) return naoAutorizado('SESSION_STALE', montarLoginUrl(req, env));

    // 5. req.user vem do Redis, não do banco.
    const user = {
      id: meta.user_id,
      login: meta.login,
      name: meta.name,
      email: meta.email,
      role_base: meta.role_base,
    };

    // 6. Papel por sistema: tabela de extensão do sgoa.
    user.papel = (await papelDe(user.id)) || papelDoPapelBase(user.role_base);

    return { ok: true, user };
  };
}
