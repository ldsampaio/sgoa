import { reactive } from 'vue';
import TipoDocumentoModel from '../models/TipoDocumentoModel.js';

export const tipoDocumentoState = reactive({
  lista: [],
  carregando: false,
  erro: null,
});

export default {
  async carregar(todos = false) {
    tipoDocumentoState.carregando = true;
    tipoDocumentoState.erro = null;
    try {
      tipoDocumentoState.lista = await TipoDocumentoModel.listar(todos);
    } catch (err) {
      tipoDocumentoState.erro = err.message;
    } finally {
      tipoDocumentoState.carregando = false;
    }
  },
};
