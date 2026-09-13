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

export async function listAll() {
  return all(
    `SELECT a.*, u.nome AS nome, u.email AS email FROM alunos a
     JOIN usuarios u ON u.id_usuario = a.id_usuario
     ORDER BY u.nome`,
  );
}