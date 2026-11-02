// Espelha o default do backend (services/enlacesValidacao.js). A autoridade é o env
// OVERLEAF_HOSTS no servidor; aqui entra só o texto do placeholder e a checagem de
// renderização — nunca a decisão de aceitação de um link.
export const HOST_OVERLEAF = import.meta.env.VITE_OVERLEAF_HOST || 'overleaf.utfpr.edu.br';

export function hostsOverleaf() {
  const bruto = import.meta.env.VITE_OVERLEAF_HOSTS || HOST_OVERLEAF;
  return String(bruto)
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

// Só renderizamos âncora para HTTPS em host da allowlist (a URL é uma capability URL).
export function ehLinkOverleaf(url) {
  if (!url) return false;
  try {
    const u = new URL(String(url));
    return u.protocol === 'https:' && hostsOverleaf().includes(u.hostname.toLowerCase());
  } catch {
    return false;
  }
}
