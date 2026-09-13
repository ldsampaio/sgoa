import { all } from '../utils/query.js';
import { create as createNotif } from '../models/notificacao.model.js';

export async function participantesDaOrientacao(idOrientacao) {
  return await all(
    `SELECT DISTINCT u.id_usuario FROM (
       SELECT o.id_orientador AS id_professor FROM orientacoes o WHERE o.id_orientacao = ?
       UNION ALL
       SELECT co.id_professor FROM co_orientadores co WHERE co.id_orientacao = ?
     ) pp
     JOIN professores p ON p.id_professor = pp.id_professor
     JOIN usuarios u ON u.id_usuario = p.id_usuario
     UNION
     SELECT a.id_usuario FROM orientacoes o2
     JOIN alunos a ON a.id_aluno = o2.id_aluno
     WHERE o2.id_orientacao = ?`,
    [idOrientacao, idOrientacao, idOrientacao],
  );
}

export async function notificarParticipantes(idOrientacao, tipo, titulo, mensagem, exceto = null) {
  const participantes = await participantesDaOrientacao(idOrientacao);
  const criadas = [];
  for (const p of participantes) {
    if (p.id_usuario === exceto) continue;
    const n = await createNotif({
      idUsuario: p.id_usuario,
      tipo,
      titulo,
      mensagem,
    });
    criadas.push(n.id_notificacao);
  }
  return criadas;
}

export async function notificarUsuario(idUsuario, tipo, titulo, mensagem) {
  return createNotif({ idUsuario, tipo, titulo, mensagem });
}