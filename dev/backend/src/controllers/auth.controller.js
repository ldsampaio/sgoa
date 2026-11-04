import { asyncHandler } from '../middleware/errorHandler.js';
import { perfilAcademico } from '../models/usuario.model.js';

// O sgoa não autentica credencial: não existe login, "esqueci senha", verificação
// de código nem redefinição de senha. Quem valida a identidade é o saga.
// `me` responde a partir de req.user (Redis) e dos campos de papel em
// auth.user_profiles.
export const me = asyncHandler(async (req, res) => {
  return res.json({
    id: req.user.id,
    login: req.user.login,
    name: req.user.name,
    email: req.user.email,
    role_base: req.user.role_base,
    papel: req.user.papel,
    perfil: await perfilAcademico(req.user.id),
  });
});
