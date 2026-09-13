import { api } from './api.js';

export default {
  async list() {
    return api.get('/usuarios');
  },
  async create(data) {
    return api.post('/usuarios', data);
  },
  async update(id, data) {
    return api.put(`/usuarios/${id}`, data);
  },
  async updateProfile(data) {
    return api.put('/usuarios/me', data);
  },
  async listProfessores() {
    return api.get('/usuarios/professores');
  },
  async listAlunos() {
    return api.get('/usuarios/alunos');
  },
};