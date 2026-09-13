import { reactive } from 'vue';
import GoogleModel from '../models/GoogleModel.js';

export const googleState = reactive({
  conectado: false,
  emailGoogle: '',
  carregando: false,
  erro: null,
});

export default {
  async carregarStatus() {
    googleState.carregando = true;
    googleState.erro = null;
    try {
      const r = await GoogleModel.status();
      googleState.conectado = !!r?.conectado;
      googleState.emailGoogle = r?.email_google || '';
    } catch (err) {
      googleState.erro = err.message;
      googleState.conectado = false;
    } finally {
      googleState.carregando = false;
    }
  },

  async conectar() {
    const { url } = await GoogleModel.authUrl();
    window.location.href = url;
  },

  async desconectar() {
    await GoogleModel.disconnect();
    googleState.conectado = false;
    googleState.emailGoogle = '';
  },
};
