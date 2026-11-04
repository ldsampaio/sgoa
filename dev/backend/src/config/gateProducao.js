// Gate de produção — espelho do SEC-02 do sgrf (`sgrf/backend/src/config/env.js`).
//
// O sgoa não autentica credencial: não há segredo de JWT próprio (o JWT-ponteiro é assinado
// pelo saga), não há cookie próprio e não há senha de admin. O que precisa ser seguro em
// produção é o acesso ao Redis compartilhado (usuário ACL `saga_readonly`) e as URLs do saga.
//
// Fora de NODE_ENV=production o gate não dispara: os defaults de desenvolvimento carregam.
// Chamado no boot da API (`server.js`) — o único processo que lê o store de sessões. Os
// workers compartilham o mesmo .env do deploy.

export const CHAVES_GATE = [
  'REDIS_URL',
  'SAGA_JWKS_URL',
  'SAGA_LOGIN_URL',
  'PORTAL_ALLOWED_REDIRECT_HOSTS',
];

function valorInseguro(valor) {
  const valorTrim = String(valor ?? '').trim();
  if (valorTrim === '') return true; // ausente: sem allowlist o verifier não monta redirect
  if (valorTrim.includes('change-me')) return true;
  if (valorTrim.toLowerCase().startsWith('dev-')) return true;
  return false;
}

export function ofensoresDoGate(env = process.env) {
  const ofensores = [];
  for (const chave of CHAVES_GATE) {
    if (valorInseguro(env[chave])) ofensores.push(chave);
  }

  // A ACL read-only é parte do contrato: o sgoa não escreve no store de sessões.
  const redisUrl = String(env.REDIS_URL ?? '').trim();
  if (redisUrl && !redisUrl.includes('saga_readonly')) ofensores.push('REDIS_URL (ACL)');

  return ofensores;
}

/**
 * Retorna null quando o ambiente de produção é aceitável; lança quando recusa o boot.
 * A mensagem nomeia só as variáveis — nenhum valor secreto aparece.
 */
export function validaGateProducao(env = process.env) {
  if (String(env.NODE_ENV ?? '').toLowerCase() !== 'production') return null;

  const ofensores = ofensoresDoGate(env);
  if (ofensores.length === 0) return null;

  throw new Error(
    `SEC-02: Production boot refused - insecure or invalid value(s) found in: ${ofensores.join(', ')}. ` +
      `REDIS_URL must use the read-only ACL user (saga_readonly) — the sgoa never writes session state. ` +
      `SAGA_JWKS_URL and SAGA_LOGIN_URL must be the real saga endpoints (no 'change-me', no 'dev-' prefix). ` +
      `PORTAL_ALLOWED_REDIRECT_HOSTS is the explicit allowlist for login_url redirects; without it the ` +
      `middleware refuses to build a redirect (open redirect). ` +
      `Set proper values in your production .env before starting with NODE_ENV=production.`
  );
}
