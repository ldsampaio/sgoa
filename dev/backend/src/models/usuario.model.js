import { all, get, run } from '../utils/query.js';
import { papelDe, papelDoPapelBase } from './perfil.model.js';

// `auth.users` e `auth.user_profiles` são do saga. O sgoa lê; nunca cria nem
// altera tabela em `auth`. Não existe mais `sgoa.usuarios` nem coluna de senha:
// o sgoa não autentica credencial, só verifica sessão.
const CAMPOS_USUARIO = 'u.id, u.login, u.name, u.email, u.role_base, u.status';

export async function findByLogin(login) {
  return await get(`SELECT ${CAMPOS_USUARIO} FROM auth.users u WHERE u.login = ?`, [login]);
}

export async function findById(id) {
  return await get(`SELECT ${CAMPOS_USUARIO} FROM auth.users u WHERE u.id = ?`, [id]);
}

export async function listAll() {
  return await all(`SELECT ${CAMPOS_USUARIO} FROM auth.users u ORDER BY u.name`);
}

function comPapel(row, papel) {
  if (!row) return null;
  return {
    id: row.id,
    login: row.login,
    name: row.name,
    email: row.email,
    role_base: row.role_base,
    papel: papel || papelDoPapelBase(row.role_base),
    ativo: row.status === 'ATIVO',
  };
}

// Perfil público montado de auth.users + auth.user_profiles (colunas canônicas)
// + sgoa.perfis (papel do sistema).
export async function publicProfile(id) {
  const user = await findById(id);
  if (!user) return null;
  return { ...comPapel(user, await papelDe(id)), perfil: await perfilAcademico(id) };
}

// Só os campos de papel (auth.user_profiles) + as entidades do sgoa.
export async function perfilAcademico(id) {
  const perfil = await get(
    `SELECT up.matricula, up.curso, up.programa_pos, up.departamento, up.data_matricula,
            a.id_aluno, p.id_professor
     FROM auth.users u
     LEFT JOIN auth.user_profiles up ON up.user_id = u.id
     LEFT JOIN sgoa.alunos a ON a.id_usuario = u.id
     LEFT JOIN sgoa.professores p ON p.id_usuario = u.id
     WHERE u.id = ?`,
    [id],
  );
  return perfil || null;
}

// O sgoa não cadastra usuário (o cadastro é do saga) e nunca escreve senha.
// Estas são as únicas escritas do sgoa sobre `auth`, e só em colunas de situação
// e de contato; nenhuma tabela do schema `auth` é criada ou alterada pelo sgoa.
export async function update(id, { nome, email }) {
  const sets = [];
  const params = [];
  if (nome !== undefined) {
    sets.push('name = ?');
    params.push(nome);
  }
  if (email !== undefined) {
    sets.push('email = ?');
    params.push(email);
  }
  if (sets.length === 0) return publicProfile(id);
  params.push(id);
  await run(`UPDATE auth.users SET ${sets.join(', ')} WHERE id = ?`, params);
  return publicProfile(id);
}

export async function setAtivo(id, ativo) {
  await run('UPDATE auth.users SET status = ? WHERE id = ?', [ativo ? 'ATIVO' : 'INATIVO', id]);
  return publicProfile(id);
}
