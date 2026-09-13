import UsuarioModel from '../models/UsuarioModel.js';

export default {
  async criar(dados) {
    return UsuarioModel.create(dados);
  },
  async atualizar(dados) {
    return UsuarioModel.updateProfile(dados);
  },
};