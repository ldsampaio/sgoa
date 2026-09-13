import nodemailer from 'nodemailer';
import { decryptSmtpPass } from '../utils/cryptoTokens.js';
import * as EmailIntegracaoModel from '../models/emailIntegracao.model.js';

// Envio de e-mails automatizados (avisos de prazo) com as credenciais
// SMTP institucionais de cada professor (servidor da universidade).
// Sem SMTP_HOST ou sem integração do remetente → stub (só log), sem falhar.

function remetentePode(erro) {
  const msg = String(erro?.message || '');
  const code = erro?.code || erro?.responseCode;
  return code === 'EAUTH' || Number(code) === 535 || /535|auth|credential/i.test(msg);
}

export function smtpConfigurado() {
  return Boolean(process.env.SMTP_HOST);
}

export async function enviarEmail({ para, assunto, texto, deUsuarioId }) {
  if (!smtpConfigurado()) {
    console.log(`[EMAIL-STUB] para=${para} assunto=${assunto} texto=${String(texto || '').slice(0, 160)}`);
    return { enviado: false, motivo: 'SMTP não configurado (modo stub).' };
  }
  const cred = deUsuarioId ? EmailIntegracaoModel.findCredenciais(deUsuarioId) : null;
  if (!cred) {
    console.log(`[EMAIL-STUB] para=${para} assunto=${assunto} (professor sem integração de e-mail)`);
    return { enviado: false, motivo: 'Professor sem integração de e-mail cadastrada.' };
  }
  let transporter;
  try {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: String(process.env.SMTP_SECURE ?? 'false').toLowerCase() === 'true',
      auth: { user: cred.smtp_user, pass: decryptSmtpPass(cred.smtp_pass_enc) },
      connectionTimeout: 15000,
      greetingTimeout: 10000,
    });
    await transporter.sendMail({
      from: cred.email_remetente,
      to: para,
      subject: assunto,
      text: texto,
    });
    if (cred.requer_reconexao) EmailIntegracaoModel.marcarReconexao(deUsuarioId, false);
    return { enviado: true, motivo: null };
  } catch (err) {
    // Senha institucional trocada? Sinaliza para recadastro sem quebrar o ciclo.
    if (remetentePode(err)) {
      EmailIntegracaoModel.marcarReconexao(deUsuarioId, true);
      console.warn(`[EMAIL] auth falhou p/ ${cred.smtp_user}: professor precisa recadastrar a senha.`);
      return { enviado: false, motivo: 'Falha de autenticação SMTP. Recadastre a senha institucional.' };
    }
    console.error(`[EMAIL] falha de envio: ${err.message}`);
    return { enviado: false, motivo: `Falha de envio: ${String(err.message).slice(0, 200)}` };
  } finally {
    try {
      await transporter?.close();
    } catch {
      // ignore
    }
  }
}
