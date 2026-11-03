import { api } from './api.js';

export default {
  async listByOrientacao(idOrientacao) {
    return api.get(`/orientacoes/${idOrientacao}/tarefas`);
  },
  async create(idOrientacao, data) {
    return api.post(`/orientacoes/${idOrientacao}/tarefas`, data);
  },
  async update(id, data) {
    return api.put(`/tarefas/${id}`, data);
  },
  async updateStatus(id, status) {
    return api.put(`/tarefas/${id}`, { status });
  },
  async arquivar(id) {
    return api.del(`/tarefas/${id}`);
  },
};
