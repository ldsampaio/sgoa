import { asyncHandler } from '../middleware/errorHandler.js';
import * as PromptModel from '../models/promptAvaliacao.model.js';
import { findById as findTipoById } from '../models/tipoDocumento.model.js';
import { findByUsuario as findProfessorByUsuario } from '../models/professor.model.js';
import { PROMPTS_PADRAO } from '../services/promptsPadrao.js';

// Resolve o professor-alvo: o próprio (Professor) ou ?id_professor= (Coordenador/Admin).
async function resolverProfessor(req, res) {
  if (req.user.tipo_usuario === 'Professor') {
    const p = await findProfessorByUsuario(req.user.id_usuario);
    if (!p) return res.status(404).json({ erro: 'Perfil de professor não encontrado.' }), null;
    return p;
  }
  if (req.user.tipo_usuario === 'Coordenador' || req.user.tipo_usuario === 'Administrador') {
    const { id_professor } = req.query;
    if (!id_professor) return res.status(400).json({ erro: 'Informe id_professor.' }), null;
    const { findById } = await import('../models/professor.model.js');
    const p = await findById(String(id_professor));
    if (!p) return res.status(404).json({ erro: 'Professor não encontrado.' }), null;
    return p;
  }
  return res.status(403).json({ erro: 'Somente professores podem gerenciar prompts de avaliação.' }), null;
}

export const listar = asyncHandler(async (req, res) => {
  const professor = await resolverProfessor(req, res);
  if (!professor) return;
  return res.json(await PromptModel.listarPorProfessor(professor.id_professor));
});

export const atualizar = asyncHandler(async (req, res) => {
  const tipoDoc = await findTipoById(req.params.idTipo);
  if (!tipoDoc) return res.status(404).json({ erro: 'Tipo de documento não encontrado.' });
  const professor = await resolverProfessor(req, res);
  if (!professor) return;
  const { prompt, restaurar } = req.body;
  if (restaurar === true) {
    const padrao = tipoDoc.prompt_padrao || PROMPTS_PADRAO[tipoDoc.nome];
    return res.json(await PromptModel.upsert(professor.id_professor, tipoDoc.id_tipo, padrao));
  }
  if (!prompt || String(prompt).trim().length < 50) {
    return res.status(400).json({ erro: 'O prompt deve ter ao menos 50 caracteres.' });
  }
  return res.json(await PromptModel.upsert(professor.id_professor, tipoDoc.id_tipo, String(prompt).trim()));
});
