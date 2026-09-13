import { api } from './api.js';

// Conta institucional única do projeto (configurada via env no backend).
// Só o administrador pode disparar o e-mail de teste.
export default {
  async testar(para) {
    return api.post('/email/testar', para ? { para } : {});
  },
};
