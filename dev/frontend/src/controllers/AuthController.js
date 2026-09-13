import { reactive } from 'vue';
import AuthModel from '../models/AuthModel.js';
import UsuarioModel from '../models/UsuarioModel.js';
import { setToken, clearToken } from '../models/api.js';
import NotificacaoModel from '../models/NotificacaoModel.js';

const USER_KEY = 'sgoa_user';

function loadStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY)) ?? null;
  } catch {
    return null;
  }
}

export const authState = reactive({
  user: loadStoredUser(),
  carregando: false,
  naoLidas: 0,
});

function persistUser(user) {
  authState.user = user;
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_KEY);
}

export const AuthController = {
  get isAutenticado() {
    return !!authState.user;
  },

  async login(email, senha) {
    authState.carregando = true;
    try {
      const { token, usuario } = await AuthModel.login(email, senha);
      setToken(token);
      persistUser(usuario);
      await this.atualizarNaoLidas();
      return usuario;
    } finally {
      authState.carregando = false;
    }
  },

  logout() {
    clearToken();
    persistUser(null);
    authState.naoLidas = 0;
  },

  async carregarPerfil() {
    const me = await AuthModel.me();
    persistUser(me);
    return me;
  },

  async atualizarPerfil(dados) {
    const me = await UsuarioModel.updateProfile(dados);
    persistUser(me);
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