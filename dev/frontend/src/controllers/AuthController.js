import { reactive } from 'vue';
import AuthModel from '../models/AuthModel.js';
import UsuarioModel from '../models/UsuarioModel.js';
import NotificacaoModel from '../models/NotificacaoModel.js';

// Estado de sessão em memória, nunca em localStorage: a fonte da verdade é o
// Redis do saga. Se o saga derruba a sessão, o próximo request 401 e o guard
// manda o usuário para o saga.
export const authState = reactive({
  user: null,
  carregando: false,
  naoLidas: 0,
});

export const AuthController = {
  get isAutenticado() {
    return !!authState.user;
  },

  async me() {
    authState.carregando = true;
    try {
      const me = await AuthModel.me();
      authState.user = me;
      return me;
    } finally {
      authState.carregando = false;
    }
  },

  limpar() {
    authState.user = null;
    authState.naoLidas = 0;
  },

  // O logout é do saga (ele derruba a sessão no Redis e remove o cookie). O sgoa
  // só limpa o estado local e manda o usuário para o `login_url` da resposta.
  redirectToSaga(loginUrl) {
    this.limpar();
    if (loginUrl) window.location.assign(loginUrl);
  },

  async atualizarPerfil(dados) {
    const me = await UsuarioModel.updateProfile(dados);
    authState.user = me;
    return me;
  },

  async atualizarNaoLidas() {
    try {
      const { total } = await NotificacaoModel.unreadCount();
      authState.naoLidas = total;
    } catch {
      authState.naoLidas = 0;
    }
  },
};
