import { reactive } from 'vue';
import OrientacaoModel from '../models/OrientacaoModel.js';

export const orientacaoState = reactive({
  lista: [],
  atual: null,
  atividades: [],
  alunos: [],
  professores: [],
  carregando: false,
  salvando: false,
  erro: null,
});

export default {
  async listar() {
    orientacaoState.carregando = true;
    orientacaoState.erro = null;
    try {
      orientacaoState.lista = await OrientacaoModel.list();
    } catch (err) {
      orientacaoState.erro = err.message;
    } finally {
      orientacaoState.carregando = false;
    }
  },

  async carregar(id) {
    orientacaoState.carregando = true;
    orientacaoState.erro = null;
    try {
      orientacaoState.atual = await OrientacaoModel.get(id);
    } catch (err) {
      orientacaoState.erro = err.message;
    } finally {
      orientacaoState.carregando = false;
    }
  },

  async buscarAlunos() {
    const { default: UsuarioModel } = await import('../models/UsuarioModel.js');
    orientacaoState.alunos = await UsuarioModel.listAlunos();
  },

  async buscarProfessores() {
    const { default: UsuarioModel } = await import('../models/UsuarioModel.js');
    orientacaoState.professores = await UsuarioModel.listProfessores();
  },

  async criar(dados) {
    orientacaoState.salvando = true;
    try {
      orientacaoState.atual = await OrientacaoModel.create(dados);
      await this.listar();
      return orientacaoState.atual;
    } finally {
      orientacaoState.salvando = false;
    }
  },

  async salvar(id, dados) {
    orientacaoState.salvando = true;
    try {
      orientacaoState.atual = await OrientacaoModel.update(id, dados);
      await this.listar();
      return orientacaoState.atual;
    } finally {
      orientacaoState.salvando = false;
    }
  },

  async carregarAtividades(id) {
    orientacaoState.atividades = await OrientacaoModel.listAtividades(id);
  },

  async adicionarCoOrientador(id, idProfessor) {
    const co = await OrientacaoModel.addCoOrientador(id, idProfessor);
    if (orientacaoState.atual) {
      orientacaoState.atual.co_orientadores = [
        ...(orientacaoState.atual.co_orientadores || []),
        co,
      ];
    }
    return co;
  },

  async removerCoOrientador(id, idProfessor) {
    await OrientacaoModel.removeCoOrientador(id, idProfessor);
    if (orientacaoState.atual) {
      orientacaoState.atual.co_orientadores = (orientacaoState.atual.co_orientadores || []).filter(
        (c) => c.id_professor !== idProfessor,
      );
    }
  },
};