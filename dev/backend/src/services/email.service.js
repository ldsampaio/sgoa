import nodemailer from 'nodemailer';
import { decryptSmtpPass } from '../utils/cryptoTokens.js';

// Envio de e-mails do projeto com a conta institucional única configurada
// via env (SMTP_USER/SMTP_FROM + SMTP_PASS_ENC cifrada com SMTP_TOKEN_KEY).
// Sem SMTP_HOST ou sem credencial completa → stub (só log), sem falhar.

function credencialGlobal() {
  const host = (process.env.SMTP_HOST || '').trim();
  const user = (process.env.SMTP_USER || '').trim();
  const from = (process.env.SMTP_FROM || '').trim();
  const passEnc = (process.env.SMTP_PASS_ENC || '').trim();
  if (!host || !user || !from || !passEnc) return null;
  return { host, user, from, passEnc };
}

export function smtpConfigurado() {
  return Boolean(credencialGlobal());
}

function criarTransporte(cred) {
  return nodemailer.createTransport({
    host: cred.host,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: String(process.env.SMTP_SECURE ?? 'false').toLowerCase() === 'true',
    auth: { user: cred.user, pass: decryptSmtpPass(cred.passEnc) },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
  });
}

async function enviar({ cred, para, assunto, texto }) {
  let transporter;
  try {
    transporter = criarTransporte(cred);
    await transporter.sendMail({
      from: cred.from,
      to: para,
      subject: assunto,
      text: texto,
    });
    return { enviado: true, motivo: null, remetente: cred.from };
  } catch (err) {
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

export async function enviarEmail({ para, assunto, texto }) {
  const cred = credencialGlobal();
  if (!cred) {
    console.log(`[EMAIL-STUB] para=${para} assunto=${assunto} texto=${String(texto || '').slice(0, 160)}`);
    return { enviado: false, motivo: 'SMTP não configurado (modo stub).' };
  }
  return enviar({ cred, para, assunto, texto });
}

// Recuperação de senha não existe no sgoa (a autenticação é do saga): só envio
// de avisos do projeto.
