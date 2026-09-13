import { asyncHandler } from '../middleware/errorHandler.js';
import * as NotificacaoModel from '../models/notificacao.model.js';

export const list = asyncHandler(async (req, res) => {
  return res.json(await NotificacaoModel.listForUsuario(req.user.id_usuario));
});

export const markRead = asyncHandler(async (req, res) => {
  const n = await NotificacaoModel.findById(req.params.id);
  if (!n) return res.status(404).json({ erro: 'Notificação não encontrada.' });
  if (n.id_usuario !== req.user.id_usuario) {
    return res.status(403).json({ erro: 'Notificação de outro usuário.' });
  }
  return res.json(await NotificacaoModel.markRead(req.params.id));
});

export const unreadCount = asyncHandler(async (req, res) => {
  return res.json({ total: await NotificacaoModel.countUnread(req.user.id_usuario) });
});