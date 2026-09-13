import { reactive } from 'vue';
import NotificacaoModel from '../models/NotificacaoModel.js';
import { AuthController } from './AuthController.js';

export const notificacaoState = reactive({
  lista: [],
  carregando: false,
  erro: null,
});

export default {
  async carregar() {
    notificacaoState.carregando = true;
    try {
      notificacaoState.lista = await NotificacaoModel.list();
    } catch (err) {
      notificacaoState.erro = err.message;
    } finally {
      notificacaoState.carregando = false;
    }
  },

  async marcarLida(n) {
    await NotificacaoModel.markRead(n.id_notificacao);
    n.lida = 1;
    await AuthController.atualizarNaoLidas();
  },
};