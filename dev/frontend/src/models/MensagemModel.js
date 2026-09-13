import { api } from './api.js';

export default {
  async listByOrientacao(idOrientacao) {
    return api.get(`/orientacoes/${idOrientacao}/mensagens`);
  },
  async create(idOrientacao, conteudo) {
    return api.post(`/orientacoes/${idOrientacao}/mensagens`, { conteudo });
  },
};