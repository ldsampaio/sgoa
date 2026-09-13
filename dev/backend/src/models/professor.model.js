import { all, get, run } from '../utils/query.js';
import { uuid } from '../utils/id.js';

export async function create({ idUsuario, matricula, departamento }) {
  const id = uuid();
  run(
    `INSERT INTO professores (id_professor, id_usuario, matricula, departamento)
     VALUES (?, ?, ?, ?)`,
    [id, idUsuario, matricula, departamento],
  );
  return get('SELECT * FROM professores WHERE id_professor = ?', [id]);
}

export async function findById(id) {
  return get('SELECT * FROM professores WHERE id_professor = ?', [id]);
}

export async function findByUsuario(idUsuario) {
  return get('SELECT * FROM professores WHERE id_usuario = ?', [idUsuario]);
}

export async function findByMatricula(matricula) {
  return get('SELECT * FROM professores WHERE matricula = ?', [matricula]);
}

export async function update(id, { matricula, departamento }) {
  const sets = [];
  const params = [];
  if (matricula !== undefined) {
    sets.push('matricula = ?');
    params.push(matricula);
  }
  if (departamento !== undefined) {
    sets.push('departamento = ?');
    params.push(departamento);
  }
  if (sets.length === 0) return findById(id);
  params.push(id);
  run(`UPDATE professores SET ${sets.join(', ')} WHERE id_professor = ?`, params);
  return findById(id);
}

export async function listAll() {
  return all(
    `SELECT p.*, u.nome AS nome FROM professores p
     JOIN usuarios u ON u.id_usuario = p.id_usuario
     ORDER BY u.nome`,
  );
}