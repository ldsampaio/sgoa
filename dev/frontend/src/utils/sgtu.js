/**
 * SGTU (onda 7 do plano ../SGTU.md): o link de ticket de cada interface.
 *
 * `origem` é o sistema de origem (allowlist do SGTU: saga|sgoa|sgrf|sgtu) e
 * `rota` é o path da interface. O SGTU valida os dois — valor fora da allowlist
 * cai para `sgtu` e rota fora do formato de path vira null — e nunca renderiza
 * a query bruta. Por isso montar a query com URLSearchParams, não com
 * concatenação de string.
 */
const SGTU_URL = (import.meta.env.VITE_SGTU_URL || 'http://localhost:5175').replace(/\/$/, '');

export function urlTicket(rota = '') {
  const path = String(rota || '');
  const query = new URLSearchParams({ origem: 'sgoa' });
  if (path.startsWith('/')) query.set('rota', path);
  return `${SGTU_URL}/tickets/novo?${query.toString()}`;
}
