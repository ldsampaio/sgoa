import 'dotenv/config';
import jwks from 'jwks-rsa';

// Cache do JWKS, keyed por `kid`: permitido porque é rotação de chave. Cache de
// liveness/sessão é proibido — cache de chave nunca concede acesso sozinho.
let client = null;

export function clienteJwks(env = process.env) {
  if (!client) {
    client = jwks({
      jwksUri: env.SAGA_JWKS_URL || 'http://localhost:8000/.well-known/jwks.json',
      cache: true,
      cacheMaxEntries: 10,
      cacheMaxAge: 10 * 60 * 1000,
      timeout: 10000,
    });
  }
  return client;
}

// `kid` do header do JWT → material de chave para jsonwebtoken. EC (ES256) é
// suportado: jwks-rsa resolve o JWK e devolve a chave pública.
export async function resolverChave(kid, env = process.env) {
  const chave = await clienteJwks(env).getSigningKey(kid);
  return chave.getPublicKey();
}
