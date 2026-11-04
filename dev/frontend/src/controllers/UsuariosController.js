import UsuarioModel from '../models/UsuarioModel.js';

// O sgoa não cadastra usuário (o cadastro é do saga) e não aceita campo `senha`.
export default {
  async atualizar(dados) {
    return UsuarioModel.updateProfile(dados);
  },
};
