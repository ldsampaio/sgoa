/**
 * Validação de e-mail institucional.
 *
 * A lista de domínios permitidos vem da variável de ambiente
 * `ALLOWED_EMAIL_DOMAINS` (separada por vírgula).
 * Ex: ALLOWED_EMAIL_DOMAINS=utfpr.edu.br,alunos.utfpr.edu.br
 *
 * - Vazio/indefinido = validação desativada (preserva dev/seed com @sgoa.dev).
 * - Subdomínios são aceitos: `alunos.utfpr.edu.br` passa se `utfpr.edu.br` permitido.
 * - Comparação case-insensitive, com trim.
 */

export function getAllowedDomains() {
  const raw = process.env.ALLOWED_EMAIL_DOMAINS ?? '';
  return raw
    .split(',')
    .map((d) => d.trim().toLowerCase().replace(/^@/, ''))
    .filter(Boolean);
}

export function extractDomain(email) {
  const normalized = String(email ?? '').trim().toLowerCase();
  const at = normalized.lastIndexOf('@');
  if (at <= 0 || at === normalized.length - 1) return '';
  return normalized.slice(at + 1);
}

export function isInstitutionalEmail(email) {
  const allowed = getAllowedDomains();
  if (allowed.length === 0) return true;
  const domain = extractDomain(email);
  if (!domain) return false;
  return allowed.some((base) => domain === base || domain.endsWith(`.${base}`));
}

export function institutionalEmailError(email) {
  if (isInstitutionalEmail(email)) return null;
  const allowed = getAllowedDomains();
  const exemplos = allowed.map((d) => `@${d}`).join(', ');
  return `E-mail deve ser institucional (${exemplos}).`;
}

/**
 * Confere o domínio de um e-mail contra uma lista de domínios base,
 * aceitando subdomínios: `fulano@professores.utfpr.edu.br` casa com
 * `utfpr.edu.br`. Sem isso, contas de subdomínio da instituição eram
 * rejeitadas (usado pela integração Google, que tem `hd` de subdomínio).
 */
export function emailCasaComDominio(email, dominios) {
  const lista = (Array.isArray(dominios) ? dominios : String(dominios ?? '').split(','))
    .map((d) => String(d).trim().toLowerCase().replace(/^@/, ''))
    .filter(Boolean);
  if (lista.length === 0) return true;
  const domain = extractDomain(email);
  if (!domain) return false;
  return lista.some((base) => domain === base || domain.endsWith(`.${base}`));
}
