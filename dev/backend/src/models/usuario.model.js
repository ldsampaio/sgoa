import { all, get, run } from '../utils/query.js';
import { uuid } from '../utils/id.js';
import { now } from '../config/database.js';

export async function findByEmail(email) {
  return await get('SELECT * FROM usuarios WHERE email = ?', [email]);
}

export async function findById(id) {
  return await get('SELECT * FROM usuarios WHERE id_usuario = ?', [id]);
}

export async function create({ nome, email, senhaHash, tipoUsuario }) {
  const id = uuid();
  await run(
    `INSERT INTO usuarios (id_usuario, nome, email, senha_hash, tipo_usuario)
     VALUES (?, ?, ?, ?, ?)`,
    [id, nome, email, senhaHash, tipoUsuario],
  );
  return findById(id);
}

export async function update(id, { nome, email, senhaHash, tipoUsuario, ativo }) {
  const sets = [];
  const params = [];
  if (nome !== undefined) {
    sets.push('nome = ?');
    params.push(nome);
  }
  if (email !== undefined) {
    sets.push('email = ?');
    params.push(email);
  }
  if (senhaHash !== undefined) {
    sets.push('senha_hash = ?');
    params.push(senhaHash);
  }
  if (tipoUsuario !== undefined) {
    sets.push('tipo_usuario = ?');
    params.push(tipoUsuario);
  }
  if (ativo !== undefined) {
    sets.push('ativo = ?');
    params.push(ativo ? 1 : 0);
  }
  if (sets.length === 0) return findById(id);
  sets.push('data_atualizacao = ?');
  params.push(now(), id);
  await run(`UPDATE usuarios SET ${sets.join(', ')} WHERE id_usuario = ?`, params);
  return findById(id);
}

export async function listAll() {
  return await all('SELECT * FROM usuarios ORDER BY nome');
}

function withRole(row) {
  if (!row) return null;
  const papelMap = {
    Professor: 'Professor',
    Aluno: 'Aluno',
    Coordenador: 'Coordenador',
    Administrador: 'Administrador',
  };
  return {
    id_usuario: row.id_usuario,
    nome: row.nome,
    email: row.email,
    tipo_usuario: row.tipo_usuario,
    papel: papelMap[row.tipo_usuario] ?? row.tipo_usuario,
    ativo: !!row.ativo,
    data_cadastro: row.data_cadastro,
  };
}

export async function publicProfile(id) {
  const user = await findById(id);
  if (!user) return null;
  const roleInfo =
    user.tipo_usuario === 'Professor'
      ? await get('SELECT id_professor, matricula, departamento FROM professores WHERE id_usuario = ?', [id])
      : user.tipo_usuario === 'Aluno'
        ? await get('SELECT id_aluno, matricula, curso, programa_pos, data_matricula FROM alunos WHERE id_usuario = ?', [id])
        : null;
  return { ...withRole(user), perfil: roleInfo };
}

export async function setAtivo(id, ativo) {
  await run('UPDATE usuarios SET ativo = ?, data_atualizacao = ? WHERE id_usuario = ?', [ativo ? 1 : 0, now(), id]);
  return publicProfile(id);
}