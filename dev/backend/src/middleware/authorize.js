export function authorize(...tipos) {
  return (req, res, next) => {
    if (!tipos.includes(req.user?.tipo_usuario)) {
      return res.status(403).json({ erro: 'Você não tem permissão para realizar esta ação.' });
    }
    next();
  };
}