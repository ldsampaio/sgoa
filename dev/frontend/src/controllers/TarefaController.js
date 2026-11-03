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

function substituir(atualizada) {
  const idx = tarefaState.lista.findIndex((t) => t.id_tarefa === atualizada.id_tarefa);
  if (idx >= 0) tarefaState.lista[idx] = atualizada;
}

export default {
  async carregar(idOrientacao) {
    tarefaState.carregando = true;
    tarefaState.erro = null;
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

  async atualizar(tarefa, dados) {
    tarefaState.salvando = true;
    try {
      const atualizada = await TarefaModel.update(tarefa.id_tarefa, dados);
      substituir(atualizada);
      return atualizada;
    } finally {
      tarefaState.salvando = false;
    }
  },

  async mover(tarefa, status, ordem) {
    const statusAnterior = tarefa.status;
    const ordemAnterior = tarefa.ordem;
    substituir({ ...tarefa, status, ordem });
    try {
      const atualizada = await TarefaModel.update(tarefa.id_tarefa, { status, ordem });
      substituir(atualizada);
      return atualizada;
    } catch (err) {
      substituir({ ...tarefa, status: statusAnterior, ordem: ordemAnterior });
      throw err;
    }
  },

  async avancarStatus(tarefa) {
    const status = novoStatus(tarefa.status);
    const atualizada = await TarefaModel.update(tarefa.id_tarefa, { status });
    substituir(atualizada);
    return atualizada;
  },

  async arquivar(tarefa) {
    tarefaState.salvando = true;
    try {
      await TarefaModel.arquivar(tarefa.id_tarefa);
      tarefaState.lista = tarefaState.lista.filter((t) => t.id_tarefa !== tarefa.id_tarefa);
    } finally {
      tarefaState.salvando = false;
    }
  },
};
