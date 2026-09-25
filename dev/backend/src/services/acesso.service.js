import { get } from '../utils/query.js';
import { findById as findOrientacao } from '../models/orientacao.model.js';
import { findByUsuario as findProfessorByUsuario } from '../models/professor.model.js';
import { findByUsuario as findAlunoByUsuario } from '../models/aluno.model.js';

export async function perfilDoUsuario(user) {
  if (user.tipo_usuario === 'Professor') {
    const p = await findProfessorByUsuario(user.id_usuario);
    return p ? { ...p, nome: user.nome } : null;
  }
  if (user.tipo_usuario === 'Aluno') {
    const a = await findAlunoByUsuario(user.id_usuario);
    return a ? { ...a, nome: user.nome } : null;
  }
  return null;
}

export async function canAcessarOrientacao(user, idOrientacao) {
  const orientacao = await get(
    `SELECT o.id_orientacao, o.id_orientador, o.id_aluno FROM orientacoes o WHERE o.id_orientacao = ?`,
    [idOrientacao],
  );
  if (!orientacao) return null;

  if (user.tipo_usuario === 'Coordenador' || user.tipo_usuario === 'Administrador') {
    return orientacao;
  }
  if (user.tipo_usuario === 'Professor') {
    const p = await findProfessorByUsuario(user.id_usuario);
    if (p && orientacao.id_orientador === p.id_professor) return orientacao;
    if (p) {
      const co = await get(
        'SELECT 1 FROM co_orientadores WHERE id_orientacao = ? AND id_professor = ?',
        [idOrientacao, p.id_professor],
      );
      if (co) return orientacao;
    }
  }
  if (user.tipo_usuario === 'Aluno') {
    const a = await findAlunoByUsuario(user.id_usuario);
    if (a && orientacao.id_aluno === a.id_aluno) return orientacao;
  }
  return false;
}

export async function requireAcesso(req, res, idOrientacao) {
  const acesso = await canAcessarOrientacao(req.user, idOrientacao);
  if (acesso === null) {
    res.status(404).json({ erro: 'Orientação não encontrada.' });
    return false;
  }
  if (acesso === false) {
    res.status(403).json({ erro: 'Você não tem acesso a esta orientação.' });
    return false;
  }
  return true;
}

/**
 * Professor só edita dados de aluno quando é orientador (ou co-orientador) de
 * ao menos uma orientação daquele aluno. Sem isso, liberar PUT /usuarios/:id
 * para Professor daria edição de qualquer aluno do sistema.
 */
export async function professorPodeEditarAluno(user, idAlunoUsuario) {
  if (user.tipo_usuario !== 'Professor') return true;
  const p = await findProfessorByUsuario(user.id_usuario);
  if (!p) return false;
  const row = await get(
    `SELECT 1 AS ok FROM orientacoes o
     WHERE o.id_aluno = (
       SELECT a.id_aluno FROM alunos a WHERE a.id_usuario = ?
     )
       AND (o.id_orientador = ?
            OR o.id_orientacao IN (
                  SELECT c.id_orientacao FROM co_orientadores c WHERE c.id_professor = ?
                ))
     LIMIT 1`,
    [idAlunoUsuario, p.id_professor, p.id_professor],
  );
  return !!row;
}

export { findOrientacao };