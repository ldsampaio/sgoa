import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAcesso, orientacoesDoUsuario } from '../services/acesso.service.js';
import * as EnlaceModel from '../models/enlaceOverleaf.model.js';
import { notificarParticipantes } from '../services/notificacao.service.js';
import { CATEGORIAS_ENLACE } from '../services/enlacesCategorias.js';
import {
  normalizarUrlOverleaf,
  normalizarCategoria,
  normalizarEstado,
  normalizarObservacao,
} from '../services/enlacesValidacao.js';

// Leitura e escrita valem para aluno, professor, coordenador e admin (RF.OV.003):
// a única barreira é a participação na orientação, já coberta por requireAcesso.

export const listarCategorias = asyncHandler(async (req, res) => {
  return res.json(CATEGORIAS_ENLACE);
});

// Agregado do usuário — todas as orientações em que ele participa (RF.OV.004).
export const listarMeus = asyncHandler(async (req, res) => {
  const orientacoes = await orientacoesDoUsuario(req.user);
  const ids = orientacoes.map((o) => o.id_orientacao);
  return res.json(await EnlaceModel.listByOrientacoes(ids, req.user.id));
});

export const listarPorOrientacao = asyncHandler(async (req, res) => {
  const id = req.params.id;
  if (!(await requireAcesso(req, res, id))) return;
  return res.json(await EnlaceModel.listByOrientacao(id, req.user.id));
});

export const detalhe = asyncHandler(async (req, res) => {
  const enlace = await EnlaceModel.findById(req.params.id, req.user.id);
  if (!enlace) return res.status(404).json({ erro: 'Enlace não encontrado.' });
  if (!(await requireAcesso(req, res, enlace.id_orientacao))) return;
  return res.json(enlace);
});

export const criar = asyncHandler(async (req, res) => {
  const idOrientacao = req.params.id;
  if (!(await requireAcesso(req, res, idOrientacao))) return;

  const url = normalizarUrlOverleaf(req.body.url);
  if (!url) return res.status(400).json({ erro: 'Link é obrigatório.' });
  const categoria = normalizarCategoria(req.body.categoria);
  const status = normalizarEstado(req.body.status);
  const observacao = normalizarObservacao(req.body.observacao);

  if (await EnlaceModel.findByUrl(idOrientacao, url)) {
    return res.status(409).json({ erro: 'Este link já está registrado nesta orientação.' });
  }

  const enlace = await EnlaceModel.create({
    idOrientacao,
    idCriador: req.user.id,
    categoria,
    url,
    status,
    observacao,
  });

  await notificarParticipantes(
    idOrientacao,
    'enlace_overleaf',
    `Novo link Overleaf — ${categoria}`,
    url,
    req.user.id,
  );

  return res.status(201).json(enlace);
});

export const atualizar = asyncHandler(async (req, res) => {
  const atual = await EnlaceModel.findById(req.params.id, req.user.id);
  if (!atual) return res.status(404).json({ erro: 'Enlace não encontrado.' });
  if (!(await requireAcesso(req, res, atual.id_orientacao))) return;

  const url = req.body.url === undefined ? undefined : normalizarUrlOverleaf(req.body.url);
  if (req.body.url !== undefined && !url) return res.status(400).json({ erro: 'Link é obrigatório.' });
  const categoria = req.body.categoria === undefined ? undefined : normalizarCategoria(req.body.categoria);
  const status = req.body.status === undefined ? undefined : normalizarEstado(req.body.status);
  const observacao = req.body.observacao === undefined ? undefined : normalizarObservacao(req.body.observacao);

  if (url && url !== atual.url && (await EnlaceModel.findByUrl(atual.id_orientacao, url))) {
    return res.status(409).json({ erro: 'Este link já está registrado nesta orientação.' });
  }

  return res.json(
    await EnlaceModel.update(req.params.id, { categoria, url, status, observacao }, req.user.id),
  );
});

export const remover = asyncHandler(async (req, res) => {
  const atual = await EnlaceModel.findById(req.params.id);
  if (!atual) return res.status(404).json({ erro: 'Enlace não encontrado.' });
  if (!(await requireAcesso(req, res, atual.id_orientacao))) return;
  await EnlaceModel.removeById(req.params.id);
  return res.status(204).end();
});

// RF.OV.006 — destaque por usuário: alterna para quem chama, nunca para os outros.
export const destacar = asyncHandler(async (req, res) => {
  const atual = await EnlaceModel.findById(req.params.id, req.user.id);
  if (!atual) return res.status(404).json({ erro: 'Enlace não encontrado.' });
  if (!(await requireAcesso(req, res, atual.id_orientacao))) return;
  const marcado = await EnlaceModel.alternarDestaque(req.params.id, req.user.id);
  return res.json({ id_enlace: req.params.id, destacado: marcado ? 1 : 0 });
});
