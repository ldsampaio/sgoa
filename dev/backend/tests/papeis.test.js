import test from 'node:test';
import assert from 'node:assert/strict';

import { papelPrincipal, temPapel } from '../src/models/perfil.model.js';
import { authorize } from '../src/middleware/authorize.js';

// `sgoa.perfis` aceita mais de um papel por usuário (UNIQUE é (id_usuario, papel)).
// Um usuário pode ser Administrador e Professor ao mesmo tempo, então a checagem é
// por lista — comparar `user.papel === 'X'` perdia um dos papéis.

test('papel principal segue a precedência de gestão', () => {
  assert.equal(papelPrincipal(['Professor', 'Administrador']), 'Administrador');
  assert.equal(papelPrincipal(['Professor']), 'Professor');
  assert.equal(papelPrincipal([]), null);
});

test('temPapel aceita a lista e o papel único (legado)', () => {
  const admin = { papel: 'Administrador', papeis: ['Administrador', 'Professor'] };
  assert.ok(temPapel(admin, 'Professor'));
  assert.ok(temPapel(admin, 'Administrador'));
  assert.ok(!temPapel(admin, 'Aluno'));

  assert.ok(temPapel({ papel: 'Professor' }, 'Professor'), 'sem lista cai no papel principal');
});

test('authorize libera quando algum papel do usuário está na lista', async () => {
  const captura = { status: 0 };
  const res = { status: (codigo) => { captura.status = codigo; return { json: () => {} }; } };
  const req = { user: { papel: 'Administrador', papeis: ['Administrador', 'Professor'] } };

  let passou = false;
  await authorize('Professor')(req, res, () => { passou = true; });
  assert.ok(passou, 'Administrador também pode o que o professor pode');

  const captura2 = { status: 0 };
  const res2 = { status: (codigo) => { captura2.status = codigo; return { json: () => {} }; } };
  let passou2 = false;
  await authorize('Aluno')(req, res2, () => { passou2 = true; });
  assert.equal(captura2.status, 403);
  assert.equal(passou2, false);
});
