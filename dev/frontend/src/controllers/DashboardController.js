import { reactive } from 'vue';
import DashboardModel from '../models/DashboardModel.js';
import { authState } from './AuthController.js';

export const dashboardState = reactive({
  dados: null,
  carregando: false,
  erro: null,
});

export default {
  async carregar() {
    dashboardState.carregando = true;
    dashboardState.erro = null;
    try {
      dashboardState.dados = await DashboardModel.get(authState.user?.tipo_usuario);
    } catch (err) {
      dashboardState.erro = err.message;
    } finally {
      dashboardState.carregando = false;
    }
  },
};