import { temPapel } from '../models/perfil.model.js';

export const PAPEIS_GESTAO_TAREFA = ['Professor', 'Coordenador', 'Administrador'];

// Exclusão é arquivamento: quem criou o cartão ou a gestão da orientação pode
// arquivar. Tarefas legadas (id_criador nulo) ficam restritas à gestão.
// O papel vem de sgoa.perfis (req.user.papeis), nunca do claim `role` do JWT.
export function podeArquivarTarefa(user, tarefa) {
  if (!user || !tarefa) return false;
  if (temPapel(user, ...PAPEIS_GESTAO_TAREFA)) return true;
  return Boolean(tarefa.id_criador) && tarefa.id_criador === user.id;
}
