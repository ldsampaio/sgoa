import { api } from './api.js';

export default {
  async listByOrientacao(idOrientacao) {
    return api.get(`/orientacoes/${idOrientacao}/avaliacoes`);
  },
  async getByDocumento(idDocumento) {
    return api.get(`/documentos/${idDocumento}/avaliacao`);
  },
  async reenviar(idAvaliacao) {
    return api.post(`/avaliacoes/${idAvaliacao}/reenviar`);
  },
};
