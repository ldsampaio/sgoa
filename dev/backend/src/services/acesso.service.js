import { get } from '../utils/query.js';
import {
  findById as findOrientacao,
  listAll as listOrientacoesAll,
  listByAluno as listOrientacoesByAluno,
  listByProfessor as listOrientacoesByProfessor,
  listByCoOrientador as listOrientacoesByCoOrientador,
} from '../models/orientacao.model.js';
import { findByUsuario as findProfessorByUsuario } from '../models/professor.model.js';
import { findByUsuario as findAlunoByUsuario } from '../models/aluno.model.js';
import { temPapel } from '../models/perfil.model.js';

export async function perfilDoUsuario(user) {
  if (temPapel(user, 'Professor')) {
    const p = await findProfessorByUsuario(user.id);
    return p ? { ...p, nome: user.name } : null;
  }
  if (temPapel(user, 'Aluno')) {
    const a = await findAlunoByUsuario(user.id);
    return a ? { ...a, nome: user.name } : null;
  }
  return null;
}

export async function canAcessarOrientacao(user, idOrientacao) {
  const orientacao = await get(
    `SELECT o.id_orientacao, o.id_orientador, o.id_aluno FROM orientacoes o WHERE o.id_orientacao = ?`,
    [idOrientacao],
  );
  if (!orientacao) return null;

  if (temPapel(user, 'Coordenador', 'Administrador')) {
    return orientacao;
  }
  if (temPapel(user, 'Professor')) {
    const p = await findProfessorByUsuario(user.id);
    if (p && orientacao.id_orientador === p.id_professor) return orientacao;
    if (p) {
      const co = await get(
        'SELECT 1 FROM co_orientadores WHERE id_orientacao = ? AND id_professor = ?',
        [idOrientacao, p.id_professor],
      );
      if (co) return orientacao;
    }
  }
  if (temPapel(user, 'Aluno')) {
    const a = await findAlunoByUsuario(user.id);
    if (a && orientacao.id_aluno === a.id_aluno) return orientacao;
  }
  return false;
}

/**
 * Orientações visíveis para o usuário (mesma semântica de canAcessarOrientacao),
 * usada pelas listagens agregadas — ex. a página consolidada de links Overleaf.
 */
export async function orientacoesDoUsuario(user) {
  if (temPapel(user, 'Coordenador', 'Administrador')) {
    return await listOrientacoesAll();
  }
  if (temPapel(user, 'Professor')) {
    const p = await findProfessorByUsuario(user.id);
    if (!p) return [];
    const propias = await listOrientacoesByProfessor(p.id_professor);
    const co = await listOrientacoesByCoOrientador(p.id_professor);
    const mapa = new Map();
    for (const o of [...propias, ...co]) mapa.set(o.id_orientacao, o);
    return [...mapa.values()];
  }
  if (temPapel(user, 'Aluno')) {
    const a = await findAlunoByUsuario(user.id);
    return a ? await listOrientacoesByAluno(a.id_aluno) : [];
  }
  return [];
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

export { findOrientacao };