import { asyncHandler } from '../middleware/errorHandler.js';
import { perfilAcademico } from '../models/usuario.model.js';
import { identificarConta } from '../services/conta.service.js';

// O sgoa não autentica credencial: não existe login, "esqueci senha", verificação
// de código nem redefinição de senha. Quem valida a identidade é o saga.
//
// `me` é o ponto de entrada do sistema: a partir da identidade do saga ele identifica
// a conta do sgoa (papel em sgoa.perfis + entidade em sgoa.alunos / sgoa.professores).
// Sem isto o usuário logado entra e não encontra conta carregada.
export const me = asyncHandler(async (req, res) => {
  const { papel, conta } = await identificarConta(req.user.id, req.user.role_base);

  return res.json({
    id: req.user.id,
    login: req.user.login,
    name: req.user.name,
    email: req.user.email,
    role_base: req.user.role_base,
    papel,
    perfil: await perfilAcademico(req.user.id),
    conta,
  });
});
