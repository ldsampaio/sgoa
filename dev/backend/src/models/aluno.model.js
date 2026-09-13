import { all, get, run } from '../utils/query.js';
import { uuid } from '../utils/id.js';

export async function create({ idUsuario, matricula, curso, programaPos, dataMatricula }) {
  const id = uuid();
  run(
    `INSERT INTO alunos (id_aluno, id_usuario, matricula, curso, programa_pos, data_matricula)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, idUsuario, matricula, curso, programaPos, dataMatricula ?? null],
  );
  return get('SELECT * FROM alunos WHERE id_aluno = ?', [id]);
}

export async function findById(id) {
  return get('SELECT * FROM alunos WHERE id_aluno = ?', [id]);
}

export async function findByUsuario(idUsuario) {
  return get('SELECT * FROM alunos WHERE id_usuario = ?', [idUsuario]);
}

export async function findByMatricula(matricula) {
  return get('SELECT * FROM alunos WHERE matricula = ?', [matricula]);
}

export async function update(id, { matricula, curso, programaPos, dataMatricula }) {
  const sets = [];
  const params = [];
  if (matricula !== undefined) {
    sets.push('matricula = ?');
    params.push(matricula);
  }
  if (curso !== undefined) {
    sets.push('curso = ?');
    params.push(curso);
  }
  if (programaPos !== undefined) {
    sets.push('programa_pos = ?');
    params.push(programaPos);
  }
  if (dataMatricula !== undefined) {
    sets.push('data_matricula = ?');
    params.push(dataMatricula);
  }
  if (sets.length === 0) return findById(id);
  params.push(id);
  run(`UPDATE alunos SET ${sets.join(', ')} WHERE id_aluno = ?`, params);
  return findById(id);
}

export async function listAll() {
  return all(
    `SELECT a.*, u.nome AS nome, u.email AS email FROM alunos a
     JOIN usuarios u ON u.id_usuario = a.id_usuario
     ORDER BY u.nome`,
  );
}