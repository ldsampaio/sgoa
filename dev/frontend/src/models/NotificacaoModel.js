import { api } from './api.js';

export default {
  async list() {
    return api.get('/notificacoes');
  },
  async unreadCount() {
    return api.get('/notificacoes/nao-lidas');
  },
  async markRead(id) {
    return api.put(`/notificacoes/${id}/lida`);
  },
};