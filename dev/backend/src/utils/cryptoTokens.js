import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import 'dotenv/config';

const ALGO = 'aes-256-gcm';

function getKey(nomeVar) {
  const hex = process.env[nomeVar] || '';
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(`${nomeVar} ausente ou inválida (esperado 32 bytes em hex).`);
  }
  return Buffer.from(hex, 'hex');
}

// Formato: ivHex:authTagHex:cipherHex
export function encryptSecret(plain, nomeVar) {
  const key = getKey(nomeVar);
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${enc.toString('hex')}`;
}

export function decryptSecret(packed, nomeVar) {
  const key = getKey(nomeVar);
  const [ivHex, tagHex, dataHex] = String(packed || '').split(':');
  if (!ivHex || !tagHex || !dataHex) throw new Error('Segredo criptografado em formato inválido.');
  const decipher = createDecipheriv(ALGO, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const dec = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
  return dec.toString('utf8');
}

// Tokens do Google (integração OAuth por professor).
export function encryptRefreshToken(plain) {
  return encryptSecret(plain, 'GOOGLE_TOKEN_KEY');
}

export function decryptRefreshToken(packed) {
  return decryptSecret(packed, 'GOOGLE_TOKEN_KEY');
}

// Senha SMTP institucional por professor (avisos por e-mail).
export function encryptSmtpPass(plain) {
  return encryptSecret(plain, 'SMTP_TOKEN_KEY');
}

export function decryptSmtpPass(packed) {
  return decryptSecret(packed, 'SMTP_TOKEN_KEY');
}
