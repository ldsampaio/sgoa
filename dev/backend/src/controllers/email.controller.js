import { asyncHandler } from '../middleware/errorHandler.js';
import { enviarEmail, smtpConfigurado } from '../services/email.service.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/email/testar (Administrador): envia e-mail de teste com a
// conta institucional única. Destino padrão = e-mail do próprio admin.
export const testarEnvio = asyncHandler(async (req, res) => {
  if (!smtpConfigurado()) {
    return res.status(502).json({ erro: 'SMTP não configurado (modo stub). Verifique SMTP_HOST/SMTP_USER/SMTP_FROM/SMTP_PASS_ENC.' });
  }
  const { para } = req.body ?? {};
  const destino = para && EMAIL_RE.test(String(para)) ? String(para) : req.user.email;
  const r = await enviarEmail({
    para: destino,
    assunto: 'SGOA: teste de e-mail institucional',
    texto: 'Este é um e-mail de teste da conta institucional do SGOA. Se você o recebeu, está tudo certo.',
  });
  if (!r.enviado) return res.status(502).json({ erro: r.motivo });
  return res.json({ sucesso: true, para: destino, remetente: r.remetente });
});
