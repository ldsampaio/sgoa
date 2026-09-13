import { api, getDownloadUrl } from './api.js';

export default {
  async listByOrientacao(idOrientacao) {
    return api.get(`/orientacoes/${idOrientacao}/documentos`);
  },
  async upload(idOrientacao, file, descricao) {
    const form = new FormData();
    form.append('arquivo', file);
    if (descricao) form.append('descricao', descricao);
    return api.upload(`/orientacoes/${idOrientacao}/documentos`, form);
  },
  downloadUrl(id) {
    return getDownloadUrl(`/documentos/${id}/download`);
  },
};