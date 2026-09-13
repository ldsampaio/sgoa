// Smoke test ponta a ponta (CI e pré-release).
// Sobe a API em porta efêmera contra o driver da vez (sqlite :memory: por padrão
// ou Postgres via DATABASE_URL) e exercita: health, criação de usuário com a
// regra de e-mail institucional, login e a rota de teste de e-mail.
// Falha (exit 1) em qualquer divergência entre drivers.
import 'dotenv/config';
import assert from 'node:assert';
import { createApp } from '../src/app.js';
import { isPostgres } from '../src/config/database.js';

process.env.ALLOWED_EMAIL_DOMAINS ??= 'utfpr.edu.br';

const app = await createApp();
const server = app.listen(0);
await new Promise((resolve) => server.on('listening', resolve));
const base = `http://localhost:${server.address().port}`;

const post = (path, body, token) =>
  fetch(`${base}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

try {
  console.log(`[SMOKE] driver=${isPostgres() ? 'postgres' : 'sqlite'}`);

  let r = await fetch(`${base}/api/health`);
  assert.strictEqual(r.status, 200, 'health deve ser 200');

  // Rota de teste de e-mail existe (401 sem token, não 404).
  r = await post('/api/email/testar', {});
  assert.strictEqual(r.status, 401, 'rota /api/email/testar deve existir (401 sem token)');

  // Bootstrap: primeiro usuário precisa ser criado via modelo (sem auth).
  const UsuarioModel = await import('../src/models/usuario.model.js');
  const { hashPassword } = await import('../src/utils/password.js');
  await UsuarioModel.create({
    nome: 'Admin Smoke',
    email: 'admin@utfpr.edu.br',
    senhaHash: hashPassword('Admin@123'),
    tipoUsuario: 'Administrador',
  });

  r = await post('/api/auth/login', { email: 'admin@utfpr.edu.br', senha: 'Admin@123' });
  assert.strictEqual(r.status, 200, 'login do admin deve ser 200');
  const { token } = await r.json();
  assert.ok(token, 'login deve retornar token');

  // Regra institucional: gmail deve ser rejeitado, utfpr aceito.
  r = await post(
    '/api/usuarios',
    { nome: 'X', email: 'x@gmail.com', senha: 'Abc@1234', tipo_usuario: 'Aluno', matricula: 'S1', curso: 'C', data_matricula: '2024-03-15' },
    token,
  );
  assert.strictEqual(r.status, 400, 'e-mail não institucional deve ser 400');
  r = await post(
    '/api/usuarios',
    { nome: 'Y', email: 'y@utfpr.edu.br', senha: 'Abc@1234', tipo_usuario: 'Aluno', matricula: 'S2', curso: 'C', data_matricula: '2024-03-15' },
    token,
  );
  assert.strictEqual(r.status, 201, `e-mail institucional deve ser 201 (foi ${r.status})`);

  // Rota de teste com auth: 502 stub (sem SMTP) ou 200 — nunca 404/403 p/ admin.
  r = await post('/api/email/testar', {}, token);
  assert.ok([200, 502].includes(r.status), `testar e-mail deve ser 200/502 (foi ${r.status})`);

  console.log('[SMOKE] OK');
} finally {
  server.close();
}
