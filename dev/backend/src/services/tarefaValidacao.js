import { STATUS_TAREFA, PRIORIDADES_TAREFA, CORES_TAREFA } from './tarefaConstantes.js';

export const PRIORIDADES = PRIORIDADES_TAREFA;
export const CORES = CORES_TAREFA;

function erroValidacao(mensagem) {
  const err = new Error(mensagem);
  err.status = 400;
  return err;
}

export function normalizarTitulo(valor) {
  const titulo = String(valor ?? '').trim();
  if (!titulo) throw erroValidacao('Título do cartão é obrigatório.');
  if (titulo.length > 160) throw erroValidacao('Título do cartão deve ter no máximo 160 caracteres.');
  return titulo;
}

export function normalizarDescricao(valor, { obrigatoria = false } = {}) {
  const descricao = String(valor ?? '').trim();
  if (obrigatoria && !descricao) throw erroValidacao('Descrição do cartão é obrigatória.');
  if (descricao.length > 2000) throw erroValidacao('Descrição do cartão deve ter no máximo 2000 caracteres.');
  return descricao || null;
}

export function normalizarPrioridade(valor, { padrao = 'Média' } = {}) {
  if (valor === undefined || valor === null || valor === '') return padrao;
  if (!PRIORIDADES.includes(valor)) {
    throw erroValidacao(`Prioridade inválida. Use: ${PRIORIDADES.join(', ')}.`);
  }
  return valor;
}

export function normalizarCor(valor, { padrao = 'branco' } = {}) {
  if (valor === undefined || valor === null || valor === '') return padrao;
  if (!CORES.includes(valor)) {
    throw erroValidacao(`Cor inválida. Use: ${CORES.join(', ')}.`);
  }
  return valor;
}

export function normalizarStatus(valor) {
  if (!STATUS_TAREFA.includes(valor)) {
    throw erroValidacao(`Status inválido. Use: ${STATUS_TAREFA.join(', ')}.`);
  }
  return valor;
}

export function normalizarOrdem(valor) {
  if (valor === undefined || valor === null || valor === '') return null;
  const ordem = Number(valor);
  if (!Number.isFinite(ordem)) throw erroValidacao('Ordem do cartão inválida.');
  return ordem;
}
