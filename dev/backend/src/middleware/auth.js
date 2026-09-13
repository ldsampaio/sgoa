import { verifyToken } from '../utils/jwt.js';
import { findById } from '../models/usuario.model.js';

export async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ erro: 'Acesso não autorizado. Token não informado.' });
  }
  try {
    const payload = verifyToken(token);
    const user = await findById(payload.id_usuario);
    if (!user) {
      return res.status(401).json({ erro: 'Usuário não encontrado.' });
    }
    if (!user.ativo) {
      return res.status(403).json({ erro: 'Usuário inativo. Contate o administrador.' });
    }
    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    return res.status(401).json({ erro: 'Sessão inválida ou expirada. Faça login novamente.' });
  }
}