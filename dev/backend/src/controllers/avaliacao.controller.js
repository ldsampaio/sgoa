import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAcesso } from '../services/acesso.service.js';
import * as AvaliacaoModel from '../models/avaliacao.model.js';
import * as DocumentoModel from '../models/documento.model.js';
import { montarPedido, publicarPedidoAvaliacao } from '../services/filaAvaliacao.service.js';
import { findById as findOrientacao } from '../models/orientacao.model.js';

export const listByOrientacao = asyncHandler(async (req, res) => {
  const id = req.params.id;
  if (!(await requireAcesso(req, res, id))) return;
  return res.json(await AvaliacaoModel.listByOrientacao(id));
});

export const getByDocumento = asyncHandler(async (req, res) => {
  const doc = await DocumentoModel.findById(req.params.id);
  if (!doc) return res.status(404).json({ erro: 'Documento não encontrado.' });
  if (!(await requireAcesso(req, res, doc.id_orientacao))) return;
  const avaliacao = await AvaliacaoModel.findByDocumento(req.params.id);
  if (!avaliacao) return res.status(404).json({ erro: 'Este documento não possui avaliação.' });
  return res.json(avaliacao);
});

// Reenvia o pedido ao Kafka (professor/coordenador/admin com acesso à orientação).
export const reenviar = asyncHandler(async (req, res) => {
  const avaliacao = await AvaliacaoModel.findById(req.params.id);
  if (!avaliacao) return res.status(404).json({ erro: 'Avaliação não encontrada.' });
  if (!(await requireAcesso(req, res, avaliacao.id_orientacao))) return;
  if (req.user.tipo_usuario === 'Aluno') {
    return res.status(403).json({ erro: 'Somente orientador ou coordenador podem reenviar avaliações.' });
  }
  const atualizada = await AvaliacaoModel.reenviar(req.params.id);
  const orientacao = await findOrientacao(atualizada.id_orientacao);
  const pedido = montarPedido({
    avaliacao: atualizada,
    documento: atualizada,
    orientacao,
    alunoNome: orientacao?.aluno?.nome,
    professorNome: orientacao?.orientador?.nome,
  });
  const { publicado, erro } = await publicarPedidoAvaliacao(pedido);
  if (!publicado && erro) {
    await AvaliacaoModel.falhar(atualizada.id_avaliacao, erro);
    return res.status(502).json({ erro, code: 'KAFKA_FALHOU', avaliacao: await AvaliacaoModel.findById(req.params.id) });
  }
  return res.json(await AvaliacaoModel.findById(req.params.id));
});
