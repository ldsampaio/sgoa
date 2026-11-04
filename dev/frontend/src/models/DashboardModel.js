import { api } from './api.js';

export default {
  async get(tipo) {
    // Administrador vê o painel de gestão — mesma fonte do Coordenador.
    const mapa = { Professor: 'professor', Aluno: 'aluno', Coordenador: 'coordenador', Administrador: 'coordenador' };
    const slug = mapa[tipo];
    if (!slug) return null;
    return api.get(`/dashboard/${slug}`);
  },
};