import { api } from './api.js';

export default {
  async me() {
    return api.get('/auth/me');
  },
};
