// RBAC por papel do sgoa: o papel vem de sgoa.perfis (resolvido pelo middleware),
// nunca do claim `role` do JWT.
export function authorize(...papeis) {
  return (req, res, next) => {
    if (!papeis.includes(req.user?.papel)) {
      return res.status(403).json({ erro: 'Você não tem permissão para realizar esta ação.' });
    }
    next();
  };
}
