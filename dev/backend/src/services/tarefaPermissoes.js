export const PAPEIS_GESTAO_TAREFA = ['Professor', 'Coordenador', 'Administrador'];

// Exclusão é arquivamento: quem criou o cartão ou a gestão da orientação pode
// arquivar. Tarefas legadas (id_criador nulo) ficam restritas à gestão.
export function podeArquivarTarefa(user, tarefa) {
  if (!user || !tarefa) return false;
  if (PAPEIS_GESTAO_TAREFA.includes(user.tipo_usuario)) return true;
  return Boolean(tarefa.id_criador) && tarefa.id_criador === user.id_usuario;
}
