import { api } from './api.js';

export default {
  async get(tipo) {
    const mapa = { Professor: 'professor', Aluno: 'aluno', Coordenador: 'coordenador' };
    const slug = mapa[tipo];
    if (!slug) return null;
    return api.get(`/dashboard/${slug}`);
  },
};