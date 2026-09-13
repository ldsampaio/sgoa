import { asyncHandler } from '../middleware/errorHandler.js';
import { hashPassword, validatePassword, verifyPassword } from '../utils/password.js';
import { signToken } from '../utils/jwt.js';
import * as UsuarioModel from '../models/usuario.model.js';
import { publicProfile } from '../models/usuario.model.js';
import * as PasswordResetService from '../services/passwordReset.service.js';
import { enviarEmailRecuperacao } from '../services/email.service.js';

const MENSAGEM_GENERICA_RECUPERACAO =
  'Se o e-mail estiver cadastrado, enviamos um código de recuperação.';

// Throttle por e-mail (independent de existir) para não vazar enumeração
// via 429 e conter abuso. Janela de 1h, máx 3 pedidos.
const pedidosPorEmail = new Map();

function throttlePorEmail(email) {
  const agora = Date.now();
  const entrada = pedidosPorEmail.get(email);
  if (!entrada || agora - entrada.inicio > 60 * 60 * 1000) {
    pedidosPorEmail.set(email, { inicio: agora, total: 1 });
    return false;
  }
  entrada.total += 1;
  return entrada.total > PasswordResetService.MAX_PEDIDOS_POR_HORA;
}

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

export const esqueciSenha = asyncHandler(async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ erro: 'Informe o e-mail cadastrado.' });
  }
  if (throttlePorEmail(email)) {
    return res.status(429).json({ erro: 'Muitas solicitações. Aguarde uma hora antes de tentar novamente.' });
  }
  const user = await UsuarioModel.findByEmail(email);
  // Resposta genérica (anti-enumeração/LGPD): não revela se existe.
  if (!user || !user.ativo) {
    return res.json({ mensagem: MENSAGEM_GENERICA_RECUPERACAO });
  }
  try {
    const codigo = await PasswordResetService.solicitarCodigo(user.id_usuario);
    await enviarEmailRecuperacao({ para: user.email, codigo });
  } catch (err) {
    if (err.status === 429) {
      return res.status(429).json({ erro: err.message });
    }
    throw err;
  }
  return res.json({ mensagem: MENSAGEM_GENERICA_RECUPERACAO });
});

export const verificarCodigo = asyncHandler(async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const codigo = String(req.body?.codigo || '').trim();
  if (!email || !codigo) {
    return res.status(400).json({ erro: 'Informe o e-mail e o código.' });
  }
  const user = await UsuarioModel.findByEmail(email);
  if (!user || !user.ativo) {
    return res.status(400).json({ erro: 'Código inválido ou expirado.' });
  }
  const resultado = await PasswordResetService.conferirCodigo(user.id_usuario, codigo);
  if (!resultado.ok) {
    return res.status(400).json({ erro: resultado.motivo });
  }
  return res.json({ valido: true, mensagem: 'Código válido. Defina sua nova senha.' });
});

export const redefinirSenha = asyncHandler(async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const codigo = String(req.body?.codigo || '').trim();
  const novaSenha = String(req.body?.novaSenha || '');
  if (!email || !codigo || !novaSenha) {
    return res.status(400).json({ erro: 'Informe e-mail, código e nova senha.' });
  }
  if (!validatePassword(novaSenha)) {
    return res.status(400).json({
      erro: 'A senha deve ter ao menos 8 caracteres, com maiúsculas, minúsculas, números e caracteres especiais.',
    });
  }
  const user = await UsuarioModel.findByEmail(email);
  if (!user || !user.ativo) {
    return res.status(400).json({ erro: 'Código inválido ou expirado.' });
  }
  const resultado = await PasswordResetService.consumirCodigo(user.id_usuario, codigo);
  if (!resultado.ok) {
    return res.status(400).json({ erro: resultado.motivo });
  }
  await UsuarioModel.update(user.id_usuario, { senhaHash: hashPassword(novaSenha) });
  return res.json({ mensagem: 'Senha redefinida com sucesso. Faça login com a nova senha.' });
});