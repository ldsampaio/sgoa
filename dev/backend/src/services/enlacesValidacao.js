import { CATEGORIAS_ENLACE, ESTADOS_ENLACE } from './enlacesCategorias.js';

const MAX_URL = 2048;
const MAX_OBSERVACAO = 500;

// Allowlist de hosts. Env OVERLEAF_HOSTS (separado por vírgula); default: só a
// instância institucional da UTFPR. Sem wildcard de subdomínio e sem porta.
export function hostsPermitidos() {
  const bruto = process.env.OVERLEAF_HOSTS || 'overleaf.utfpr.edu.br';
  return String(bruto)
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

function erro(status, mensagem) {
  const e = new Error(mensagem);
  e.status = status;
  return e;
}

/**
 * Valida e normaliza o link colado pelo usuário.
 * Regra dura: HTTPS + host exato da allowlist. O caminho não é validado
 * (aceita /project/, /read/ e qualquer outra forma que o Overleaf gerar).
 */
export function normalizarUrlOverleaf(valor) {
  const bruto = String(valor ?? '').trim();
  if (!bruto) return null;

  let url;
  try {
    url = new URL(bruto);
  } catch {
    throw erro(400, `Link inválido: informe uma URL completa, ex. https://overleaf.utfpr.edu.br/project/<token>.`);
  }

  if (url.protocol !== 'https:') {
    throw erro(400, `Link inválido: use HTTPS. Domínios permitidos: ${hostsPermitidos().join(', ')}.`);
  }

  const host = url.hostname.toLowerCase();
  if (!hostsPermitidos().includes(host)) {
    throw erro(400, `Link inválido: o domínio deve ser um de ${hostsPermitidos().join(', ')} (recebido: ${host}).`);
  }

  // Normalização: host minúsculo, sem fragment, sem barra final, sem espaços.
  url.hash = '';
  url.hostname = host;
  let texto = url.toString();
  texto = texto.replace(/\/+$/, '');
  if (texto.length > MAX_URL) throw erro(400, `Link muito longo (máximo ${MAX_URL} caracteres).`);
  return texto;
}

// Categoria do documento: aceita o texto em qualquer caixa, devolve a forma canônica do enum.
export function normalizarCategoria(valor) {
  const bruto = String(valor ?? '').trim();
  if (!bruto) throw erro(400, 'Categoria é obrigatória.');
  const canonica = CATEGORIAS_ENLACE.find((c) => c.toLowerCase() === bruto.toLowerCase());
  if (!canonica) throw erro(400, `Categoria inválida. Use uma de: ${CATEGORIAS_ENLACE.join(', ')}.`);
  return canonica;
}

export function normalizarEstado(valor, padrao = 'Vigente') {
  const bruto = valor === undefined || valor === null ? '' : String(valor).trim();
  if (!bruto) return padrao;
  const canonica = ESTADOS_ENLACE.find((e) => e.toLowerCase() === bruto.toLowerCase());
  if (!canonica) throw erro(400, `Situação inválida. Use: ${ESTADOS_ENLACE.join(', ')}.`);
  return canonica;
}

export function normalizarObservacao(valor) {
  const bruto = valor === undefined || valor === null ? '' : String(valor).trim();
  if (!bruto) return null;
  if (bruto.length > MAX_OBSERVACAO) throw erro(400, `Observação muito longa (máximo ${MAX_OBSERVACAO} caracteres).`);
  return bruto;
}
