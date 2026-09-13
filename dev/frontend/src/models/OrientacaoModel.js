import { api } from './api.js';

export default {
  async list() {
    return api.get('/orientacoes');
  },
  async listAtividades(id) {
    return api.get(`/orientacoes/${id}/atividades`);
  },
  async get(id) {
    return api.get(`/orientacoes/${id}`);
  },
  async create(data) {
    return api.post('/orientacoes', data);
  },
  async update(id, data) {
    return api.put(`/orientacoes/${id}`, data);
  },
  async addCoOrientador(id, idProfessor) {
    return api.post(`/orientacoes/${id}/coorientadores`, { id_professor: idProfessor });
  },
  async removeCoOrientador(id, idProfessor) {
    return api.del(`/orientacoes/${id}/coorientadores/${idProfessor}`);
  },
};