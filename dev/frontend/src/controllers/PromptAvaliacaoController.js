import { reactive } from 'vue';
import PromptAvaliacaoModel from '../models/PromptAvaliacaoModel.js';

export const promptState = reactive({
  prompts: [],
  carregando: false,
  salvando: {},
  erro: null,
});

export default {
  async carregar() {
    promptState.carregando = true;
    promptState.erro = null;
    try {
      promptState.prompts = await PromptAvaliacaoModel.listar();
    } catch (err) {
      promptState.erro = err.message;
    } finally {
      promptState.carregando = false;
    }
  },

  async salvar(idTipo, prompt) {
    promptState.salvando[idTipo] = true;
    try {
      const atualizado = await PromptAvaliacaoModel.salvar(idTipo, prompt);
      const i = promptState.prompts.findIndex((p) => p.id_tipo === idTipo);
      if (i >= 0) promptState.prompts[i] = atualizado;
      else promptState.prompts.push(atualizado);
      return atualizado;
    } finally {
      promptState.salvando[idTipo] = false;
    }
  },

  async restaurar(idTipo) {
    promptState.salvando[idTipo] = true;
    try {
      const atualizado = await PromptAvaliacaoModel.restaurar(idTipo);
      const i = promptState.prompts.findIndex((p) => p.id_tipo === idTipo);
      if (i >= 0) promptState.prompts[i] = atualizado;
      return atualizado.prompt;
    } finally {
      promptState.salvando[idTipo] = false;
    }
  },
};
