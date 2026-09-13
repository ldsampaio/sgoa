import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import 'dotenv/config';

const ALGO = 'aes-256-gcm';

function getKey() {
  const hex = process.env.GOOGLE_TOKEN_KEY || '';
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error('GOOGLE_TOKEN_KEY ausente ou inválida (esperado 32 bytes em hex).');
  }
  return Buffer.from(hex, 'hex');
}

// Formato: ivHex:authTagHex:cipherHex
export function encryptRefreshToken(plain) {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${enc.toString('hex')}`;
}

export function decryptRefreshToken(packed) {
  const key = getKey();
  const [ivHex, tagHex, dataHex] = String(packed || '').split(':');
  if (!ivHex || !tagHex || !dataHex) throw new Error('Token criptografado em formato inválido.');
  const decipher = createDecipheriv(ALGO, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const dec = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
  return dec.toString('utf8');
}
