import { reactive } from 'vue';
import TarefaModel from '../models/TarefaModel.js';

export const tarefaState = reactive({
  lista: [],
  carregando: false,
  salvando: false,
  erro: null,
});

function novoStatus(status) {
  const ordem = ['Pendente', 'Em Andamento', 'Concluída'];
  if (status === 'Concluída') return 'Pendente';
  const idx = ordem.indexOf(status);
  return ordem[(idx + 1) % ordem.length];
}

export default {
  async carregar(idOrientacao) {
    tarefaState.carregando = true;
    try {
      tarefaState.lista = await TarefaModel.listByOrientacao(idOrientacao);
    } catch (err) {
      tarefaState.erro = err.message;
    } finally {
      tarefaState.carregando = false;
    }
  },

  async criar(idOrientacao, dados) {
    tarefaState.salvando = true;
    try {
      const tarefa = await TarefaModel.create(idOrientacao, dados);
      tarefaState.lista.unshift(tarefa);
      return tarefa;
    } finally {
      tarefaState.salvando = false;
    }
  },

  async avancarStatus(tarefa) {
    const status = novoStatus(tarefa.status);
    const atualizada = await TarefaModel.updateStatus(tarefa.id_tarefa, status);
    const idx = tarefaState.lista.findIndex((t) => t.id_tarefa === tarefa.id_tarefa);
    if (idx >= 0) tarefaState.lista[idx] = atualizada;
    return atualizada;
  },
};