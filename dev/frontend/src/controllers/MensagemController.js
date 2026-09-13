import { reactive } from 'vue';
import MensagemModel from '../models/MensagemModel.js';

export const mensagemState = reactive({
  lista: [],
  carregando: false,
  enviando: false,
  erro: null,
});

export default {
  async carregar(idOrientacao) {
    mensagemState.carregando = true;
    try {
      mensagemState.lista = await MensagemModel.listByOrientacao(idOrientacao);
    } catch (err) {
      mensagemState.erro = err.message;
    } finally {
      mensagemState.carregando = false;
    }
  },

  async enviar(idOrientacao, conteudo) {
    mensagemState.enviando = true;
    try {
      const msg = await MensagemModel.create(idOrientacao, conteudo);
      mensagemState.lista.push(msg);
      return msg;
    } finally {
      mensagemState.enviando = false;
    }
  },
};