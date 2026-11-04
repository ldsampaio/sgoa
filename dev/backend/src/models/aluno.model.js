import { all, get, run } from '../utils/query.js';
import { uuid } from '../utils/id.js';

// `sgoa.alunos` guarda só a entidade do sgoa. Os campos acadêmicos
// (matricula, curso, programa_pos, data_matricula) são canônicos em
// auth.user_profiles — o sgoa lê, nunca escreve nesse schema.
const SELECT_BASE = `
  SELECT a.id_aluno, a.id_usuario, u.login, u.name AS nome, u.email, u.role_base,
         CASE WHEN u.status = 'ATIVO' THEN 1 ELSE 0 END AS ativo,
         up.matricula, up.curso, up.programa_pos, up.data_matricula
  FROM alunos a
  JOIN auth.users u ON u.id = a.id_usuario
  LEFT JOIN auth.user_profiles up ON up.user_id = a.id_usuario
`;

export async function criar({ idUsuario }) {
  const id = uuid();
  await run('INSERT INTO alunos (id_aluno, id_usuario) VALUES (?, ?)', [id, idUsuario]);
  return await get(`${SELECT_BASE} WHERE a.id_aluno = ?`, [id]);
}

export async function findById(id) {
  return await get(`${SELECT_BASE} WHERE a.id_aluno = ?`, [id]);
}

export async function findByUsuario(idUsuario) {
  return await get(`${SELECT_BASE} WHERE a.id_usuario = ?`, [idUsuario]);
}

export async function findByMatricula(matricula) {
  return await get(`${SELECT_BASE} WHERE up.matricula = ?`, [matricula]);
}

export async function listAll() {
  return await all(`${SELECT_BASE} ORDER BY u.name`);
}
