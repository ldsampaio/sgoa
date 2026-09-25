// Datas vindas do backend são ISO (YYYY-MM-DD) sem fuso, mas `new Date('2024-08-01')`
// é interpretado como UTC midnight e exibido no dia anterior em fusos negativos
// (ex: 01/08/2024 virava 31/07/2024 em São Paulo). Parseamos as partes manualmente.
function partesData(valor) {
  const m = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (!m) return null;
  const [, ano, mes, dia, hora, minuto] = m;
  return {
    ano: Number(ano),
    mes: Number(mes) - 1,
    dia: Number(dia),
    hora: hora === undefined ? null : Number(hora),
    minuto: minuto === undefined ? null : Number(minuto),
    temHora: hora !== undefined,
  };
}

export function formatarData(valor) {
  if (!valor) return '—';
  const p = partesData(valor);
  if (!p) return valor;
  // Datas com hora são instantes absolutos: usa o fuso do navegador.
  if (p.temHora) return new Date(valor).toLocaleDateString('pt-BR');
  return new Date(p.ano, p.mes, p.dia).toLocaleDateString('pt-BR');
}

export function formatarDataHora(valor) {
  if (!valor) return '—';
  const p = partesData(valor);
  if (!p) return valor;
  if (p.temHora) {
    return (
      new Date(valor).toLocaleDateString('pt-BR') +
      ' ' +
      new Date(valor).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    );
  }
  return new Date(p.ano, p.mes, p.dia).toLocaleDateString('pt-BR');
}

export function diasRestantes(valor) {
  if (!valor) return null;
  const p = partesData(valor);
  const alvo = p && !p.temHora ? new Date(p.ano, p.mes, p.dia) : new Date(valor);
  return Math.ceil((alvo - new Date()) / 86400000);
}

export function inicial(nome) {
  if (!nome) return '?';
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}
