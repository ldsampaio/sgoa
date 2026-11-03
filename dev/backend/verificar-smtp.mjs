// Verificação: confere se SMTP_PASS_ENC decifra para a senha esperada,
// comparando apenas impressões (nunca imprime a senha).
import 'dotenv/config';
import { createHash } from 'node:crypto';
import { decryptSmtpPass } from './src/utils/cryptoTokens.js';

const esperado = process.argv[2];

function impressao(s) {
  return {
    tamanho: String(s.length),
    sha256_8: createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 8),
  };
}

const enc = (process.env.SMTP_PASS_ENC || '').trim();
if (!enc) {
  console.error('SMTP_PASS_ENC vazio no ambiente.');
  process.exit(1);
}

let decifrada;
try {
  decifrada = decryptSmtpPass(enc);
} catch (err) {
  console.error(`FALHA ao decifrar: ${err.message}`);
  console.error('-> SMTP_TOKEN_KEY provavelmente diferente da que cifrou este valor.');
  process.exit(1);
}

console.log('SMTP_USER      :', process.env.SMTP_USER || '(vazio)');
console.log('SMTP_HOST      :', process.env.SMTP_HOST || '(vazio)');
console.log('SMTP_PORT      :', process.env.SMTP_PORT || '(vazio)');
console.log('SMTP_SECURE    :', process.env.SMTP_SECURE || '(vazio)');
console.log('decifrada      :', JSON.stringify(impressao(decifrada)));

if (esperado !== undefined) {
  const b = impressao(esperado);
  console.log('esperada       :', JSON.stringify(b));
  console.log(decifrada === esperado ? '\n>>> COINCIDEM' : '\n>>> NAO COINCIDEM');
}
