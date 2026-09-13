import { asyncHandler } from '../middleware/errorHandler.js';
import * as UsuarioModel from '../models/usuario.model.js';
import * as ProfessorModel from '../models/professor.model.js';
import * as AlunoModel from '../models/aluno.model.js';
import { hashPassword, validatePassword } from '../utils/password.js';
import { institutionalEmailError } from '../utils/email.js';
import { publicProfile } from '../models/usuario.model.js';
import { garantirPadroes } from '../models/promptAvaliacao.model.js';
import { validarDataMatricula } from '../services/prazos.service.js';

const TIPOS = ['Professor', 'Aluno', 'Coordenador', 'Administrador'];

export const createUsuario = asyncHandler(async (req, res) => {
  const { nome, email, senha, tipo_usuario, matricula, departamento, curso, programa_pos, data_matricula } = req.body;

  // Professores só podem incluir alunos.
  const tipo = req.user?.tipo_usuario === 'Professor' ? 'Aluno' : tipo_usuario;
  if (req.user?.tipo_usuario === 'Professor' && tipo_usuario && tipo_usuario !== 'Aluno') {
    return res.status(403).json({ erro: 'Professores só podem cadastrar alunos.' });
  }

  if (!nome || !email || !senha) {
    return res.status(400).json({ erro: 'Nome, e-mail e senha são obrigatórios.' });
  }
  const erroEmail = institutionalEmailError(email);
  if (erroEmail) {
    return res.status(400).json({ erro: erroEmail });
  }
  if (!TIPOS.includes(tipo)) {
    return res.status(400).json({ erro: `Tipo de usuário inválido. Use um de: ${TIPOS.join(', ')}.` });
  }
  if (!validatePassword(senha)) {
    return res.status(400).json({
      erro: 'A senha deve ter no mínimo 8 caracteres, incluindo maiúsculas, minúsculas, números e caracteres especiais.',
    });
  }
  if (await UsuarioModel.findByEmail(email.toLowerCase())) {
    return res.status(409).json({ erro: 'Já existe um usuário com este e-mail.' });
  }

  const user = await UsuarioModel.create({
    nome,
    email: email.toLowerCase(),
    senhaHash: hashPassword(senha),
    tipoUsuario: tipo,
  });

  if (tipo === 'Professor') {
    if (!matricula) {
      return res.status(400).json({ erro: 'Matrícula é obrigatória para professores.' });
    }
    const professor = await ProfessorModel.create({ idUsuario: user.id_usuario, matricula, departamento });
    await garantirPadroes(professor.id_professor);
  }
  if (tipo === 'Aluno') {
    if (!matricula || !curso) {
      return res.status(400).json({ erro: 'Matrícula e curso são obrigatórios para alunos.' });
    }
    if (!validarDataMatricula(data_matricula)) {
      return res.status(400).json({ erro: 'Data de matrícula inválida. Use o formato YYYY-MM-DD, não futura.' });
    }
    await AlunoModel.create({ idUsuario: user.id_usuario, matricula, curso, programaPos: programa_pos, dataMatricula: data_matricula });
  }

  return res.status(201).json(await publicProfile(user.id_usuario));
});

export const listUsuarios = asyncHandler(async (req, res) => {
  const rows = await UsuarioModel.listAll();
  const fotos = await Promise.all(rows.map((r) => publicProfile(r.id_usuario)));
  return res.json(fotos);
});

// Edição por Coordenador/Administrador (nunca altera senha por aqui).
// Troca de tipo preserva o perfil antigo (histórico de orientações) e cria o novo.
export const updateUsuario = asyncHandler(async (req, res) => {
  const alvo = await UsuarioModel.findById(req.params.id);
  if (!alvo) return res.status(404).json({ erro: 'Usuário não encontrado.' });

  const { nome, email, tipo_usuario, ativo, matricula, departamento, curso, programa_pos, data_matricula } =
    req.body ?? {};

  if (email !== undefined) {
    const erroEmail = institutionalEmailError(email);
    if (erroEmail) {
      return res.status(400).json({ erro: erroEmail });
    }
    const outro = await UsuarioModel.findByEmail(String(email).toLowerCase());
    if (outro && outro.id_usuario !== alvo.id_usuario) {
      return res.status(409).json({ erro: 'Já existe um usuário com este e-mail.' });
    }
  }

  const novoTipo = tipo_usuario === undefined ? alvo.tipo_usuario : tipo_usuario;
  if (!TIPOS.includes(novoTipo)) {
    return res.status(400).json({ erro: `Tipo de usuário inválido. Use um de: ${TIPOS.join(', ')}.` });
  }
  const trocouTipo = novoTipo !== alvo.tipo_usuario;

  if (trocouTipo) {
    // Exige os campos do perfil novo; o perfil antigo é mantido (histórico).
    if (novoTipo === 'Professor' && !matricula) {
      return res.status(400).json({ erro: 'Matrícula é obrigatória para professores.' });
    }
    if (novoTipo === 'Aluno' && (!matricula || !curso)) {
      return res.status(400).json({ erro: 'Matrícula e curso são obrigatórios para alunos.' });
    }
  }
  if ((trocouTipo && novoTipo === 'Aluno') || data_matricula !== undefined) {
    const dataRef = data_matricula !== undefined ? data_matricula : (await AlunoModel.findByUsuario(alvo.id_usuario))?.data_matricula;
    if (novoTipo === 'Aluno' && !validarDataMatricula(dataRef)) {
      return res.status(400).json({ erro: 'Data de matrícula inválida. Use o formato YYYY-MM-DD, não futura.' });
    }
  }
  if (matricula !== undefined) {
    const check =
      novoTipo === 'Professor'
        ? await ProfessorModel.findByMatricula(matricula)
        : novoTipo === 'Aluno'
          ? await AlunoModel.findByMatricula(matricula)
          : null;
    if (check && check.id_usuario !== alvo.id_usuario) {
      return res.status(409).json({ erro: 'Já existe um usuário com esta matrícula.' });
    }
  }

  await UsuarioModel.update(alvo.id_usuario, {
    nome,
    email: email === undefined ? undefined : String(email).toLowerCase(),
    tipoUsuario: trocouTipo ? novoTipo : undefined,
    ativo,
  });

  if (novoTipo === 'Professor' && (trocouTipo || matricula !== undefined || departamento !== undefined)) {
    const existente = await ProfessorModel.findByUsuario(alvo.id_usuario);
    if (existente) {
      await ProfessorModel.update(existente.id_professor, { matricula, departamento });
    } else {
      const professor = await ProfessorModel.create({ idUsuario: alvo.id_usuario, matricula, departamento });
      await garantirPadroes(professor.id_professor);
    }
  }
  if (novoTipo === 'Aluno' && (trocouTipo || matricula !== undefined || curso !== undefined || programa_pos !== undefined || data_matricula !== undefined)) {
    const existente = await AlunoModel.findByUsuario(alvo.id_usuario);
    if (existente) {
      await AlunoModel.update(existente.id_aluno, {
        matricula,
        curso,
        programaPos: programa_pos,
        dataMatricula: data_matricula,
      });
    } else {
      await AlunoModel.create({
        idUsuario: alvo.id_usuario,
        matricula,
        curso,
        programaPos: programa_pos,
        dataMatricula: data_matricula,
      });
    }
  }

  return res.json(await publicProfile(alvo.id_usuario));
});

export const updateMe = asyncHandler(async (req, res) => {
  const { nome, email, senha } = req.body;
  if (email !== undefined && email !== null && String(email).trim() !== '') {
    const erroEmail = institutionalEmailError(email);
    if (erroEmail) {
      return res.status(400).json({ erro: erroEmail });
    }
  }
  if (senha && !validatePassword(senha)) {
    return res.status(400).json({
      erro: 'A senha deve ter no mínimo 8 caracteres, incluindo maiúsculas, minúsculas, números e caracteres especiais.',
    });
  }
  const user = await UsuarioModel.update(req.user.id_usuario, {
    nome,
    email: email ? email.toLowerCase() : undefined,
    senhaHash: senha ? hashPassword(senha) : undefined,
  });
  return res.json(await publicProfile(user.id_usuario));
});

export const listProfessores = asyncHandler(async (_req, res) => {
  return res.json(await ProfessorModel.listAll());
});

export const listAlunos = asyncHandler(async (_req, res) => {
  return res.json(await AlunoModel.listAll());
});