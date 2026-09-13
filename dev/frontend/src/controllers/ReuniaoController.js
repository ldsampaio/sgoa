import { reactive } from 'vue';
import ReuniaoModel from '../models/ReuniaoModel.js';

export const reuniaoState = reactive({
  lista: [],
  carregando: false,
  salvando: false,
  erro: null,
});

export default {
  async carregar(idOrientacao) {
    reuniaoState.carregando = true;
    try {
      reuniaoState.lista = await ReuniaoModel.listByOrientacao(idOrientacao);
    } catch (err) {
      reuniaoState.erro = err.message;
    } finally {
      reuniaoState.carregando = false;
    }
  },

  async criar(idOrientacao, dados) {
    reuniaoState.salvando = true;
    try {
      const reuniao = await ReuniaoModel.create(idOrientacao, dados);
      reuniaoState.lista.unshift(reuniao);
      return reuniao;
    } finally {
      reuniaoState.salvando = false;
    }
  },

  async excluir(idOrientacao, idReuniao) {
    reuniaoState.salvando = true;
    try {
      await ReuniaoModel.remove(idOrientacao, idReuniao);
      reuniaoState.lista = reuniaoState.lista.filter((r) => r.id_reuniao !== idReuniao);
    } finally {
      reuniaoState.salvando = false;
    }
  },
};