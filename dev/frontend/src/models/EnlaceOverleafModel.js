import { api } from './api.js';

export default {
  async listar(idOrientacao) {
    return api.get(`/orientacoes/${idOrientacao}/enlaces`);
  },
  // Agregado do usuário: todas as orientações em que ele participa (RF.OV.004).
  async listarPorUsuario() {
    return api.get('/enlaces/me');
  },
  async categorias() {
    return api.get('/enlaces/categorias');
  },
  async criar(idOrientacao, dados) {
    return api.post(`/orientacoes/${idOrientacao}/enlaces`, dados);
  },
  async atualizar(id, dados) {
    return api.put(`/enlaces/${id}`, dados);
  },
  async remover(id) {
    return api.del(`/enlaces/${id}`);
  },
  // Destaque por usuário (RF.OV.006).
  async destacar(id) {
    return api.patch(`/enlaces/${id}/destacar`, {});
  },
};
