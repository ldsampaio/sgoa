// Teste do verificador: cifra e decifra com a MESMA chave.
import { createCipheriv, randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const chave = randomBytes(32).toString('hex');
const senha = 'MinhaSenh@123';

const iv = randomBytes(12);
const c = createCipheriv('aes-256-gcm', Buffer.from(chave, 'hex'), iv);
const enc = Buffer.concat([c.update(senha, 'utf8'), c.final()]);
const packed = `${iv.toString('hex')}:${c.getAuthTag().toString('hex')}:${enc.toString('hex')}`;

const rodar = (key, esperado) => {
  try {
    const out = execFileSync('node', ['verificar-smtp.mjs', ...(esperado ? [esperado] : [])], {
      env: { ...process.env, SMTP_TOKEN_KEY: key, SMTP_PASS_ENC: packed },
      encoding: 'utf8',
    });
    console.log(out.trim());
  } catch (e) {
    console.log((e.stdout || '').toString().trim() || (e.stderr || '').toString().trim());
  }
};

console.log('--- chave correta + senha correta (deve COINCIDIR) ---');
rodar(chave, senha);
console.log('\n--- chave correta + senha errada (deve NAO COINCIDIR) ---');
rodar(chave, 'OutraSenha@9');
console.log('\n--- chave errada (deve falhar a decifragem) ---');
rodar(randomBytes(32).toString('hex'), senha);
