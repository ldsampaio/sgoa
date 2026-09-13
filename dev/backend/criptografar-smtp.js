// Gera o valor cifrado para SMTP_PASS_ENC a partir da senha institucional.
// Uso: node criptografar-smtp.js "sua-senha"
// Lê SMTP_TOKEN_KEY do .env (mesma chave usada para decifrar em runtime).
import 'dotenv/config';
import { encryptSmtpPass } from './src/utils/cryptoTokens.js';

const senha = process.argv[2];
if (!senha) {
  console.error('Uso: node criptografar-smtp.js "sua-senha-institucional"');
  process.exit(1);
}
try {
  const cifrado = encryptSmtpPass(senha);
  console.log('Cole no .env:');
  console.log(`SMTP_PASS_ENC=${cifrado}`);
} catch (err) {
  console.error(`Erro: ${err.message}`);
  process.exit(1);
}
