import { asyncHandler } from '../middleware/errorHandler.js';
import { verifyPassword } from '../utils/password.js';
import { signToken } from '../utils/jwt.js';
import * as UsuarioModel from '../models/usuario.model.js';
import { publicProfile } from '../models/usuario.model.js';

export const login = asyncHandler(async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) {
    return res.status(400).json({ erro: 'Informe e-mail e senha.' });
  }
  const user = await UsuarioModel.findByEmail(email.toLowerCase());
  if (!user || !verifyPassword(senha, user.senha_hash)) {
    return res.status(401).json({ erro: 'E-mail ou senha inválidos.' });
  }
  if (!user.ativo) {
    return res.status(403).json({ erro: 'Usuário inativo. Contate o administrador.' });
  }
  const perfil = await publicProfile(user.id_usuario);
  const token = signToken({ id_usuario: user.id_usuario, tipo_usuario: user.tipo_usuario });
  return res.json({ token, usuario: perfil });
});

export const me = asyncHandler(async (req, res) => {
  const perfil = await publicProfile(req.user.id_usuario);
  return res.json(perfil);
});