import { reactive } from 'vue';
import AvaliacaoModel from '../models/AvaliacaoModel.js';

// Cache por orientação: { [idOrientacao]: { porDocumento: { [idDoc]: avaliacao }, carregando } }
export const avaliacaoState = reactive({
  porOrientacao: {},
  carregando: false,
  detalhe: null,
  erro: null,
});

function entrada(idOrientacao) {
  if (!avaliacaoState.porOrientacao[idOrientacao]) {
    avaliacaoState.porOrientacao[idOrientacao] = { porDocumento: {} };
  }
  return avaliacaoState.porOrientacao[idOrientacao];
}

export default {
  async carregarPorOrientacao(idOrientacao) {
    avaliacaoState.carregando = true;
    avaliacaoState.erro = null;
    try {
      const lista = await AvaliacaoModel.listByOrientacao(idOrientacao);
      const e = entrada(idOrientacao);
      e.porDocumento = {};
      for (const a of lista) e.porDocumento[a.id_documento] = a;
    } catch (err) {
      avaliacaoState.erro = err.message;
    } finally {
      avaliacaoState.carregando = false;
    }
  },

  avaliacaoDoDocumento(idOrientacao, idDocumento) {
    return avaliacaoState.porOrientacao[idOrientacao]?.porDocumento[idDocumento] || null;
  },

  async verDetalhe(idDocumento) {
    avaliacaoState.detalhe = await AvaliacaoModel.getByDocumento(idDocumento);
    return avaliacaoState.detalhe;
  },

  fecharDetalhe() {
    avaliacaoState.detalhe = null;
  },

  async reenviar(idOrientacao, idAvaliacao) {
    const atualizada = await AvaliacaoModel.reenviar(idAvaliacao);
    entrada(idOrientacao).porDocumento[atualizada.id_documento] = atualizada;
    if (avaliacaoState.detalhe?.id_avaliacao === idAvaliacao) {
      avaliacaoState.detalhe = atualizada;
    }
    return atualizada;
  },
};
