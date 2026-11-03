export const COLUNAS_KANBAN = [
  { status: 'Pendente', titulo: 'A fazer' },
  { status: 'Em Andamento', titulo: 'Fazendo' },
  { status: 'Concluída', titulo: 'Feito' },
];

export const PRIORIDADES_KANBAN = ['Baixa', 'Média', 'Alta'];

export const CORES_KANBAN = [
  { chave: 'branco', rotulo: 'Branco' },
  { chave: 'azul', rotulo: 'Azul' },
  { chave: 'amarelo', rotulo: 'Amarelo' },
  { chave: 'lilas', rotulo: 'Lilás' },
  { chave: 'menta', rotulo: 'Menta' },
  { chave: 'neutro', rotulo: 'Neutro' },
];

export function colunaDoStatus(status) {
  if (status === 'Concluída') return 'Concluída';
  if (status === 'Em Andamento') return 'Em Andamento';
  return 'Pendente';
}

// Ordem entre dois vizinhos: média quando há os dois; -1/+1 nas pontas.
export function calcularOrdem(lista, indice) {
  const anterior = indice > 0 ? Number(lista[indice - 1]?.ordem) : null;
  const proximo = indice < lista.length ? Number(lista[indice]?.ordem) : null;
  if (anterior == null && proximo == null) return 0;
  if (anterior == null) return proximo - 1;
  if (proximo == null) return anterior + 1;
  return (anterior + proximo) / 2;
}

export function statusDaColunaVizinha(statusAtual, direcao) {
  const atual = colunaDoStatus(statusAtual);
  const idx = COLUNAS_KANBAN.findIndex((c) => c.status === atual);
  const alvo = idx + direcao;
  if (alvo < 0 || alvo >= COLUNAS_KANBAN.length) return null;
  return COLUNAS_KANBAN[alvo].status;
}
