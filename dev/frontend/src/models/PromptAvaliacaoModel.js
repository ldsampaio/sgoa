import { api } from './api.js';

export default {
  async listar() {
    return api.get('/prompts-avaliacao');
  },
  async salvar(idTipo, prompt) {
    return api.put(`/prompts-avaliacao/${idTipo}`, { prompt });
  },
  async restaurar(idTipo) {
    return api.put(`/prompts-avaliacao/${idTipo}`, { restaurar: true });
  },
};
