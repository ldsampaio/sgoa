import { api } from './api.js';

export default {
  async minha() {
    return api.get('/email-integracao/minha');
  },
  async salvar(dados) {
    return api.post('/email-integracao/minha', dados);
  },
  async testar(para) {
    return api.post('/email-integracao/minha/testar', para ? { para } : {});
  },
  async remover() {
    return api.del('/email-integracao/minha');
  },
};
