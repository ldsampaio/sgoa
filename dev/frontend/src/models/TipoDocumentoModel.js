import { api } from './api.js';

export default {
  async listar(todos = false) {
    return api.get(todos ? '/tipos-documento?todos=1' : '/tipos-documento');
  },
  async criar(dados) {
    return api.post('/tipos-documento', dados);
  },
  async atualizar(id, dados) {
    return api.put(`/tipos-documento/${id}`, dados);
  },
  async alternarAtivo(id) {
    return api.patch(`/tipos-documento/${id}/ativo`, {});
  },
  async remover(id) {
    return api.del(`/tipos-documento/${id}`);
  },
};
