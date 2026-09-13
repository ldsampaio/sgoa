import { api } from './api.js';

export default {
  async verificar(idOrientacao) {
    return api.post('/lembretes/verificar', idOrientacao ? { id_orientacao: idOrientacao } : {});
  },
  async getConfig(idOrientacao) {
    return api.get(`/lembretes/orientacoes/${idOrientacao}/config`);
  },
  async updateConfig(idOrientacao, dados) {
    return api.put(`/lembretes/orientacoes/${idOrientacao}/config`, dados);
  },
  async marcarEtapas(idOrientacao, dados) {
    return api.put(`/lembretes/orientacoes/${idOrientacao}/etapas`, dados);
  },
  async listarEnvios(idOrientacao) {
    return api.get(`/lembretes/orientacoes/${idOrientacao}/envios`);
  },
};
