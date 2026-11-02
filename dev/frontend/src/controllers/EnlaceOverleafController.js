import { reactive } from 'vue';
import EnlaceOverleafModel from '../models/EnlaceOverleafModel.js';

export const enlaceState = reactive({
  lista: [],
  categorias: [],
  carregando: false,
  salvando: false,
  erro: null,
});

export default {
  async carregar(idOrientacao) {
    enlaceState.carregando = true;
    enlaceState.erro = null;
    try {
      if (!enlaceState.categorias.length) enlaceState.categorias = await EnlaceOverleafModel.categorias();
      enlaceState.lista = await EnlaceOverleafModel.listar(idOrientacao);
    } catch (err) {
      enlaceState.erro = err.message;
    } finally {
      enlaceState.carregando = false;
    }
  },

  async carregarMeus() {
    enlaceState.carregando = true;
    enlaceState.erro = null;
    try {
      if (!enlaceState.categorias.length) enlaceState.categorias = await EnlaceOverleafModel.categorias();
      enlaceState.lista = await EnlaceOverleafModel.listarPorUsuario();
    } catch (err) {
      enlaceState.erro = err.message;
    } finally {
      enlaceState.carregando = false;
    }
  },

  async criar(idOrientacao, dados) {
    enlaceState.salvando = true;
    try {
      const enlace = await EnlaceOverleafModel.criar(idOrientacao, dados);
      enlaceState.lista.unshift(enlace);
      return enlace;
    } finally {
      enlaceState.salvando = false;
    }
  },

  async atualizar(enlace, dados) {
    enlaceState.salvando = true;
    try {
      const atualizado = await EnlaceOverleafModel.atualizar(enlace.id_enlace, dados);
      const idx = enlaceState.lista.findIndex((e) => e.id_enlace === enlace.id_enlace);
      if (idx >= 0) enlaceState.lista[idx] = atualizado;
      return atualizado;
    } finally {
      enlaceState.salvando = false;
    }
  },

  async remover(enlace) {
    enlaceState.salvando = true;
    try {
      await EnlaceOverleafModel.remover(enlace.id_enlace);
      enlaceState.lista = enlaceState.lista.filter((e) => e.id_enlace !== enlace.id_enlace);
    } finally {
      enlaceState.salvando = false;
    }
  },

  async destacar(enlace) {
    const resultado = await EnlaceOverleafModel.destacar(enlace.id_enlace);
    const idx = enlaceState.lista.findIndex((e) => e.id_enlace === enlace.id_enlace);
    if (idx >= 0) enlaceState.lista[idx] = { ...enlaceState.lista[idx], destacado: resultado.destacado };
    return resultado;
  },
};
