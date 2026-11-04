import { all, get, run } from '../utils/query.js';
import { uuid } from '../utils/id.js';

// `sgoa.professores` guarda só a entidade do sgoa. `matricula` e `departamento`
// são canônicos em auth.user_profiles — o sgoa lê, nunca escreve nesse schema.
const SELECT_BASE = `
  SELECT p.id_professor, p.id_usuario, u.login, u.name AS nome, u.email, u.role_base,
         CASE WHEN u.status = 'ATIVO' THEN 1 ELSE 0 END AS ativo,
         up.matricula, up.departamento
  FROM professores p
  JOIN auth.users u ON u.id = p.id_usuario
  LEFT JOIN auth.user_profiles up ON up.user_id = p.id_usuario
`;

export async function criar({ idUsuario }) {
  const id = uuid();
  await run('INSERT INTO professores (id_professor, id_usuario) VALUES (?, ?)', [id, idUsuario]);
  return await get(`${SELECT_BASE} WHERE p.id_professor = ?`, [id]);
}

export async function findById(id) {
  return await get(`${SELECT_BASE} WHERE p.id_professor = ?`, [id]);
}

export async function findByUsuario(idUsuario) {
  return await get(`${SELECT_BASE} WHERE p.id_usuario = ?`, [idUsuario]);
}

export async function findByMatricula(matricula) {
  return await get(`${SELECT_BASE} WHERE up.matricula = ?`, [matricula]);
}

export async function listAll() {
  return await all(`${SELECT_BASE} ORDER BY u.name`);
}
