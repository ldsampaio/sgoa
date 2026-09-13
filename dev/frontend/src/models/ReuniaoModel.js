import { api } from './api.js';

export default {
  async listByOrientacao(idOrientacao) {
    return api.get(`/orientacoes/${idOrientacao}/reunioes`);
  },
  async create(idOrientacao, data) {
    return api.post(`/orientacoes/${idOrientacao}/reunioes`, data);
  },
  async remove(idOrientacao, idReuniao) {
    return api.del(`/orientacoes/${idOrientacao}/reunioes/${idReuniao}`);
  },
};