import { asyncHandler } from '../middleware/errorHandler.js';
import * as UsuarioModel from '../models/usuario.model.js';
import * as ProfessorModel from '../models/professor.model.js';
import * as AlunoModel from '../models/aluno.model.js';
import { institutionalEmailError } from '../utils/email.js';

// O sgoa não cadastra usuário — o cadastro é do saga (schema `auth`). Nenhuma rota
// do sgoa aceita campo `senha`/`password` (rejeição explícita no middleware).
// Os campos de papel (matricula, curso, programa_pos, departamento, data_matricula)
// são lidos de auth.user_profiles: o sgoa só lê esse schema.

export const listUsuarios = asyncHandler(async (req, res) => {
  const rows = await UsuarioModel.listAll();
  return res.json(await Promise.all(rows.map((r) => UsuarioModel.publicProfile(r.id))));
});

// Situação da conta + dados de contato. Coordenador/Administrador.
export const updateUsuario = asyncHandler(async (req, res) => {
  const alvo = await UsuarioModel.findById(req.params.id);
  if (!alvo) return res.status(404).json({ erro: 'Usuário não encontrado.' });

  const { nome, email, ativo } = req.body ?? {};

  if (email !== undefined && email !== null && String(email).trim() !== '') {
    const erroEmail = institutionalEmailError(email);
    if (erroEmail) return res.status(400).json({ erro: erroEmail });
  }

  await UsuarioModel.update(alvo.id, {
    nome,
    email: email === undefined ? undefined : String(email).toLowerCase(),
  });
  if (ativo !== undefined) await UsuarioModel.setAtivo(alvo.id, ativo);

  return res.json(await UsuarioModel.publicProfile(alvo.id));
});

export const updateMe = asyncHandler(async (req, res) => {
  const { nome, email } = req.body ?? {};
  if (email !== undefined && email !== null && String(email).trim() !== '') {
    const erroEmail = institutionalEmailError(email);
    if (erroEmail) return res.status(400).json({ erro: erroEmail });
  }
  return res.json(await UsuarioModel.update(req.user.id, {
    nome,
    email: email ? String(email).toLowerCase() : undefined,
  }));
});

export const listProfessores = asyncHandler(async (_req, res) => {
  return res.json(await ProfessorModel.listAll());
});

export const listAlunos = asyncHandler(async (_req, res) => {
  return res.json(await AlunoModel.listAll());
});
