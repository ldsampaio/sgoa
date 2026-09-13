import { asyncHandler } from '../middleware/errorHandler.js';
import * as EmailIntegracaoModel from '../models/emailIntegracao.model.js';
import { encryptSmtpPass } from '../utils/cryptoTokens.js';
import { enviarEmail, smtpConfigurado } from '../services/email.service.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const getMinha = asyncHandler(async (req, res) => {
  const atual = EmailIntegracaoModel.findByUsuario(req.user.id_usuario);
  return res.json({ smtp_configurado: smtpConfigurado(), integracao: atual ?? null });
});

export const salvarMinha = asyncHandler(async (req, res) => {
  const { email_remetente, smtp_user, smtp_pass } = req.body ?? {};
  if (!email_remetente || !EMAIL_RE.test(String(email_remetente))) {
    return res.status(400).json({ erro: 'E-mail remetente inválido.' });
  }
  if (!smtp_user?.trim()) {
    return res.status(400).json({ erro: 'Usuário SMTP é obrigatório.' });
  }
  if (!smtp_pass) {
    return res.status(400).json({ erro: 'Senha institucional é obrigatória.' });
  }
  // Trocou a senha institucional? Recadastre aqui (a senha é guardada cifrada).
  return res.status(201).json(
    EmailIntegracaoModel.upsert({
      idUsuario: req.user.id_usuario,
      emailRemetente: String(email_remetente).toLowerCase(),
      smtpUser: String(smtp_user).trim(),
      smtpPassEnc: encryptSmtpPass(String(smtp_pass)),
    }),
  );
});

export const testarMinha = asyncHandler(async (req, res) => {
  const atual = EmailIntegracaoModel.findByUsuario(req.user.id_usuario);
  if (!atual) return res.status(404).json({ erro: 'Nenhuma integração de e-mail cadastrada.' });
  const { para } = req.body ?? {};
  const destino = para && EMAIL_RE.test(String(para)) ? String(para) : req.user.email;
  const r = await enviarEmail({
    para: destino,
    assunto: 'SGOA: teste de e-mail institucional',
    texto: 'Este é um e-mail de teste da integração SMTP do SGOA. Se você o recebeu, está tudo certo.',
    deUsuarioId: req.user.id_usuario,
  });
  if (!r.enviado) return res.status(502).json({ erro: r.motivo });
  return res.json({ sucesso: true, para: destino });
});

export const removerMinha = asyncHandler(async (req, res) => {
  EmailIntegracaoModel.removeByUsuario(req.user.id_usuario);
  return res.json({ sucesso: true });
});
