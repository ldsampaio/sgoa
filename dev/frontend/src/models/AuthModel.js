import { api } from './api.js';

export default {
  async login(email, senha) {
    return api.post('/auth/login', { email, senha });
  },
  async me() {
    return api.get('/auth/me');
  },
};