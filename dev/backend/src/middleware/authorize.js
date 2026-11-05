// RBAC por papel do sgoa: o papel vem de sgoa.perfis (resolvido pelo middleware),
// nunca do claim `role` do JWT. Um usuário pode ter mais de um papel, então a
// checagem é por lista — `temPapel` cobre o caso Administrador + Professor.
import { temPapel } from '../models/perfil.model.js';

export function authorize(...papeis) {
  return (req, res, next) => {
    if (!temPapel(req.user, ...papeis)) {
      return res.status(403).json({ erro: 'Você não tem permissão para realizar esta ação.' });
    }
    next();
  };
}
