import * as ParametrosModel from '../models/parametros.model.js';

// Soma N meses a uma data YYYY-MM-DD com clamp de fim de mês
// (ex: 2024-01-31 + 1 mês = 2024-02-29, não 03-03 como faria o date() do SQLite).
export function somarMeses(dataIso, meses) {
  const [a, m, d] = String(dataIso).split('-').map(Number);
  const total = (m - 1) + meses;
  const ano = a + Math.floor(total / 12);
  const mes = (total % 12) + 1;
  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const dia = Math.min(d, ultimoDia);
  const p = (n) => String(n).padStart(2, '0');
  return `${ano}-${p(mes)}-${p(dia)}`;
}

export function validarDataMatricula(valor) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const [a, m, d] = valor.split('-').map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d));
  if (dt.getUTCFullYear() !== a || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return false;
  const hoje = new Date().toISOString().slice(0, 10);
  return valor <= hoje;
}

// Calcula os prazos regulatórios de uma orientação a partir da data de
// matrícula do aluno e dos parâmetros vigentes. TCC não tem prazos (null).
// Retorna { prazo_conclusao, prazo_qualificacao } em YYYY-MM-DD ou null.
export function calcularPrazos(dataMatricula, nivel, parametros) {
  if (!dataMatricula) return { prazo_conclusao: null, prazo_qualificacao: null };
  const params = parametros || ParametrosModel.findByNivel(nivel);
  if (!params) return { prazo_conclusao: null, prazo_qualificacao: null };
  return {
    prazo_conclusao:
      params.prazo_conclusao_meses == null ? null : somarMeses(dataMatricula, params.prazo_conclusao_meses),
    prazo_qualificacao:
      params.prazo_qualificacao_meses == null ? null : somarMeses(dataMatricula, params.prazo_qualificacao_meses),
  };
}

export function diasRestantes(dataIso) {
  if (!dataIso) return null;
  return Math.ceil((new Date(`${dataIso}T00:00:00`) - new Date()) / 86400000);
}
