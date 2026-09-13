import { api } from './api.js';

export default {
  async authUrl() {
    return api.get('/integracoes/google/auth-url');
  },
  async status() {
    return api.get('/integracoes/google/status');
  },
  async disconnect() {
    return api.del('/integracoes/google');
  },
};
