import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAcesso } from '../services/acesso.service.js';
import * as MensagemModel from '../models/mensagem.model.js';
import { notificarParticipantes } from '../services/notificacao.service.js';

export const listByOrientacao = asyncHandler(async (req, res) => {
  const id = req.params.id;
  if (!(await requireAcesso(req, res, id))) return;
  return res.json(await MensagemModel.listByOrientacao(id));
});

export const create = asyncHandler(async (req, res) => {
  const id = req.params.id;
  if (!(await requireAcesso(req, res, id))) return;

  const { conteudo } = req.body;
  if (!conteudo?.trim()) {
    return res.status(400).json({ erro: 'A mensagem não pode estar vazia.' });
  }
  const mensagem = await MensagemModel.create({
    idOrientacao: id,
    idRemetente: req.user.id_usuario,
    conteudo: conteudo.trim(),
  });
  await notificarParticipantes(
    id,
    'mensagem',
    'Nova mensagem',
    `${req.user.nome} enviou uma mensagem na orientação.`,
    req.user.id_usuario,
  );
  return res.status(201).json(mensagem);
});