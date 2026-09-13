import { api, getDownloadUrl } from './api.js';

export default {
  async listByOrientacao(idOrientacao) {
    return api.get(`/orientacoes/${idOrientacao}/documentos`);
  },
  async upload(idOrientacao, file, descricao, idTipo) {
    const form = new FormData();
    form.append('arquivo', file);
    if (descricao) form.append('descricao', descricao);
    if (idTipo) form.append('id_tipo', idTipo);
    return api.upload(`/orientacoes/${idOrientacao}/documentos`, form);
  },
  downloadUrl(id) {
    return getDownloadUrl(`/documentos/${id}/download`);
  },
};