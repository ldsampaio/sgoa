import { api } from './api.js';

export default {
  async login(email, senha) {
    return api.post('/auth/login', { email, senha });
  },
  async me() {
    return api.get('/auth/me');
  },
  async solicitarCodigo(email) {
    return api.post('/auth/esqueci-senha', { email });
  },
  async verificarCodigo(email, codigo) {
    return api.post('/auth/verificar-codigo', { email, codigo });
  },
  async redefinirSenha(email, codigo, novaSenha) {
    return api.post('/auth/redefinir-senha', { email, codigo, novaSenha });
  },
};