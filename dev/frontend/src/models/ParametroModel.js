import { api } from './api.js';

export default {
  async list() {
    return api.get('/parametros-prazos');
  },
  async update(nivel, dados) {
    return api.put(`/parametros-prazos/${nivel}`, dados);
  },
};
