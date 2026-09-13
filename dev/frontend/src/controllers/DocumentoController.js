import { reactive } from 'vue';
import DocumentoModel from '../models/DocumentoModel.js';

export const documentoState = reactive({
  lista: [],
  carregando: false,
  enviando: false,
  erro: null,
});

export default {
  async carregar(idOrientacao) {
    documentoState.carregando = true;
    try {
      documentoState.lista = await DocumentoModel.listByOrientacao(idOrientacao);
    } catch (err) {
      documentoState.erro = err.message;
    } finally {
      documentoState.carregando = false;
    }
  },

  async enviar(idOrientacao, arquivo, descricao, idTipo) {
    documentoState.enviando = true;
    try {
      const doc = await DocumentoModel.upload(idOrientacao, arquivo, descricao, idTipo);
      documentoState.lista.unshift(doc);
      return doc;
    } finally {
      documentoState.enviando = false;
    }
  },

  urlDownload(id) {
    return DocumentoModel.downloadUrl(id);
  },
};