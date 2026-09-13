// Bootstrap do administrador inicial (produção).
// Uso: ADMIN_NAME="..." ADMIN_EMAIL="..." ADMIN_PASSWORD="..." node scripts/create-admin.js
// Cria o admin SOMENTE se não existir nenhum usuário. Idempotente e seguro
// para rodar a cada deploy. Nunca apaga nada (diferente do seed, travado em prod).
import 'dotenv/config';
import { initDatabase } from '../src/config/database.js';
import { all } from '../src/utils/query.js';
import * as UsuarioModel from '../src/models/usuario.model.js';
import { hashPassword, validatePassword } from '../src/utils/password.js';

const nome = (process.env.ADMIN_NAME || 'Administrador do Sistema').trim();
const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const senha = String(process.env.ADMIN_PASSWORD || '');

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('[ADMIN] ADMIN_EMAIL ausente ou inválido.');
  process.exit(1);
}
if (!validatePassword(senha)) {
  console.error('[ADMIN] ADMIN_PASSWORD deve ter ao menos 8 caracteres, com maiúsculas, minúsculas, números e caracteres especiais.');
  process.exit(1);
}

await initDatabase();

const existentes = await all('SELECT id_usuario FROM usuarios LIMIT 1');
if (existentes.length > 0) {
  console.log('[ADMIN] já existe ao menos um usuário — nada a fazer.');
  process.exit(0);
}

const user = await UsuarioModel.create({
  nome,
  email,
  senhaHash: hashPassword(senha),
  tipoUsuario: 'Administrador',
});
console.log(`[ADMIN] administrador criado: ${user.email}`);
