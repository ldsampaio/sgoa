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

const get = (path, token) =>
  fetch(`${base}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });

const patch = (path, body, token) =>
  fetch(`${base}${path}`, {
    method: 'PATCH',
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

  // RF.OV — enlaces Overleaf: domínio validado, duplicidade, destaque por usuário,
  // agregado e notificação. Deve responder igual nos dois drivers.
  r = await get('/api/enlaces/categorias', token);
  assert.strictEqual(r.status, 200, 'categorias de enlace devem ser 200');
  const categorias = await r.json();
  assert.ok(Array.isArray(categorias) && categorias.length === 8, 'enum de categorias com 8 valores');
  assert.ok(categorias.includes('Convalidação'), 'enum inclui Convalidação');

  const rProf = await post(
    '/api/usuarios',
    { nome: 'Prof Smoke', email: 'prof@utfpr.edu.br', senha: 'Prof@1234', tipo_usuario: 'Professor', matricula: 'SP1', departamento: 'Smoke' },
    token,
  );
  assert.strictEqual(rProf.status, 201, 'criar professor deve ser 201');
  const prof = await rProf.json();
  assert.ok(prof.perfil?.id_professor, 'perfil de professor deve existir');

  const rAluno = await post(
    '/api/usuarios',
    { nome: 'Aluno Smoke', email: 'aluno@utfpr.edu.br', senha: 'Aluno@1234', tipo_usuario: 'Aluno', matricula: 'SA1', curso: 'Smoke', data_matricula: '2024-03-15' },
    token,
  );
  assert.strictEqual(rAluno.status, 201, 'criar aluno deve ser 201');
  const aluno = await rAluno.json();

  const tokenAluno = (await (await post('/api/auth/login', { email: 'aluno@utfpr.edu.br', senha: 'Aluno@1234' })).json()).token;
  assert.ok(tokenAluno, 'login do aluno deve retornar token');
  const tokenProf = (await (await post('/api/auth/login', { email: 'prof@utfpr.edu.br', senha: 'Prof@1234' })).json()).token;
  assert.ok(tokenProf, 'login do professor deve retornar token');

  // Orientação criada pelo professor (admin não pode criar sem id_orientador explícito).
  const rOri = await post('/api/orientacoes', { id_aluno: aluno.perfil.id_aluno, tipo: 'TCC', titulo_provisorio: 'Smoke TCC' }, tokenProf);
  assert.strictEqual(rOri.status, 201, 'criar orientação deve ser 201');
  const orientacao = await rOri.json();
  const idOri = orientacao.id_orientacao;

  // Domínio de fora da allowlist: 400.
  r = await post(`/api/orientacoes/${idOri}/enlaces`, { categoria: 'TCC1', url: 'https://www.overleaf.com/project/abc' }, tokenAluno);
  assert.strictEqual(r.status, 400, 'link de outro domínio deve ser 400');

  // Link institucional: 201.
  r = await post(`/api/orientacoes/${idOri}/enlaces`, { categoria: 'TCC1', url: 'https://overleaf.utfpr.edu.br/project/smoke-tcc1' }, tokenAluno);
  assert.strictEqual(r.status, 201, `link institucional deve ser 201 (foi ${r.status})`);
  const enlace = await r.json();
  assert.strictEqual(enlace.destacado, 0, 'sem destaque na criação');

  // Duplicidade (UNIQUE id_orientacao + url): 409.
  r = await post(`/api/orientacoes/${idOri}/enlaces`, { categoria: 'TCC1', url: 'https://overleaf.utfpr.edu.br/project/smoke-tcc1' }, tokenAluno);
  assert.strictEqual(r.status, 409, 'link duplicado deve ser 409');

  // Destaque é por usuário: marcar para o professor não muda a lista do aluno.
  r = await patch('/api/enlaces/' + enlace.id_enlace + '/destacar', {}, tokenProf);
  assert.strictEqual(r.status, 200, 'destacar deve ser 200');
  const marc = await r.json();
  assert.strictEqual(marc.destacado, 1, 'professor destacou o enlace');

  const listaProfessor = await (await get('/api/enlaces/me', tokenProf)).json();
  assert.ok(listaProfessor.some((e) => e.destacado === 1), 'lista do professor mostra o destaque');
  const listaAluno = await (await get('/api/enlaces/me', tokenAluno)).json();
  assert.ok(listaAluno.every((e) => e.destacado === 0), 'lista do aluno não mostra o destaque do professor');

  // Quem não participa da orientação não lê os enlaces.
  const rFora = await post(
    '/api/usuarios',
    { nome: 'Fora Smoke', email: 'fora@utfpr.edu.br', senha: 'Fora@1234', tipo_usuario: 'Aluno', matricula: 'SA2', curso: 'Smoke', data_matricula: '2024-03-15' },
    token,
  );
  assert.strictEqual(rFora.status, 201, 'criar aluno fora deve ser 201');
  const tokenFora = (await (await post('/api/auth/login', { email: 'fora@utfpr.edu.br', senha: 'Fora@1234' })).json()).token;
  r = await get(`/api/orientacoes/${idOri}/enlaces`, tokenFora);
  assert.strictEqual(r.status, 403, 'usuário fora da orientação deve ser 403');

  // Notificação chegou ao professor (não a quem criou).
  const notificacoes = await (await get('/api/notificacoes', tokenProf)).json();
  assert.ok(notificacoes.some((n) => n.tipo === 'enlace_overleaf'), 'notificação de enlace deve existir');

  // Card do dashboard (RF.OV.004): traz os enlaces com os fixados primeiro.
  const painel = await (await get('/api/dashboard/professor', tokenProf)).json();
  assert.ok(Array.isArray(painel.enlaces), 'dashboard do professor deve trazer enlaces');
  assert.ok(painel.enlaces.some((e) => e.destacado === 1), 'dashboard ordena pelos links fixados');

  // Editar e remover: mesma autorização para aluno e professor (RF.OV.003).
  r = await fetch(`${base}/api/enlaces/${enlace.id_enlace}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenAluno}` },
    body: JSON.stringify({ status: 'Encerrado' }),
  });
  assert.strictEqual(r.status, 200, 'editar enlace deve ser 200');
  const editado = await r.json();
  assert.strictEqual(editado.status, 'Encerrado', 'status encerrado');

  r = await fetch(`${base}/api/enlaces/${enlace.id_enlace}`, { method: 'DELETE', headers: { Authorization: `Bearer ${tokenProf}` } });
  assert.strictEqual(r.status, 204, 'remover enlace deve ser 204');

  console.log('[SMOKE] OK');
} finally {
  server.close();
}
