import { api } from './api.js';

export default {
  async listByOrientacao(idOrientacao) {
    return api.get(`/orientacoes/${idOrientacao}/tarefas`);
  },
  async create(idOrientacao, data) {
    return api.post(`/orientacoes/${idOrientacao}/tarefas`, data);
  },
  async updateStatus(id, status) {
    return api.put(`/tarefas/${id}`, { status });
  },
};