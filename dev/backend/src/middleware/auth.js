import { criarVerificador } from '../services/sessionVerifier.js';
import { portRedis } from '../config/redis.js';
import { papeisDe } from '../models/perfil.model.js';

// Middleware de verificação de sessão compartilhada. O sgoa não autentica
// credencial: ele confirma no Redis que a sessão do saga está viva.
//
// 401 e 503 são caminhos distintos — o frontend trata cada um de forma diferente
// (401 → redirect para o saga; 503 → página de erro própria).
export function criarMiddlewareAuth({ redis, resolverChave, papeisDe: papeisDoSistema = papeisDe, env = process.env } = {}) {
  const verificar = criarVerificador({
    redis: redis || portRedis(),
    resolverChave,
    papeisDe: papeisDoSistema,
    env,
  });

  return async function authenticate(req, res, next) {
    const resultado = await verificar(req);

    if (!resultado.ok) {
      for (const [chave, valor] of Object.entries(resultado.headers || {})) res.set(chave, valor);
      return res.status(resultado.status).json(resultado.body);
    }

    // req.user vem do Redis (nunca do banco). O token nunca é logado.
    req.user = resultado.user;
    next();
  };
}

export const authenticate = criarMiddlewareAuth();
