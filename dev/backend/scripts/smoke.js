// Smoke test ponta a ponta (CI e pré-release).
// Sobe a API em porta efêmera contra o Postgres compartilhado e exercita o
// contrato de sessão: o sgoa não autentica credencial, só verifica a sessão do
// saga no Redis. Sem cookie e sem heartbeat não há acesso.
import 'dotenv/config';
import assert from 'node:assert';
import { createApp } from '../src/app.js';

process.env.ALLOWED_EMAIL_DOMAINS ??= 'utfpr.edu.br';

const app = await createApp();
const server = app.listen(0);
await new Promise((resolve) => server.on('listening', resolve));
const base = `http://localhost:${server.address().port}`;

const get = (path) => fetch(`${base}${path}`, { credentials: 'include' });
const post = (path, body) =>
  fetch(`${base}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

try {
  let r = await get('/api/health');
  assert.strictEqual(r.status, 200, 'health deve ser 200');

  // Sem cookie de sessão: 401 NO_SESSION (ou 503 se o heartbeat do saga não está
  // no Redis). Nunca 200.
  r = await get('/api/auth/me');
  assert.ok([401, 503].includes(r.status), `/auth/me sem cookie deve ser 401/503 (foi ${r.status})`);
  const corpo = await r.json();
  assert.ok(['NO_SESSION', 'IDENTITY_UNAVAILABLE'].includes(corpo.code), `code inesperado: ${corpo.code}`);
  if (r.status === 503) {
    assert.ok(!corpo.login_url, '503 não pode trazer login_url (não se redireciona para o serviço que caiu)');
  }

  // T10: nenhuma rota aceita campo `senha`.
  r = await post('/api/usuarios/me', { nome: 'X', senha: 'Abc@1234' });
  assert.strictEqual(r.status, 400, 'corpo com campo senha deve ser rejeitado');

  console.log('[SMOKE] OK');
} finally {
  server.close();
}
