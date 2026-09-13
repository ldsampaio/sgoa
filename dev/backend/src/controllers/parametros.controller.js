import { asyncHandler } from '../middleware/errorHandler.js';
import * as ParametrosModel from '../models/parametros.model.js';

export const list = asyncHandler(async (_req, res) => {
  return res.json(ParametrosModel.listAll());
});

// Alteração exclusiva do Coordenador (regulamento do programa).
export const update = asyncHandler(async (req, res) => {
  const nivel = String(req.params.nivel || '');
  if (!ParametrosModel.NIVEIS.includes(nivel)) {
    return res.status(400).json({ erro: `Nível inválido. Use um de: ${ParametrosModel.NIVEIS.join(', ')}.` });
  }
  const { prazo_conclusao_meses, prazo_qualificacao_meses } = req.body ?? {};
  for (const [campo, valor] of [
    ['prazo_conclusao_meses', prazo_conclusao_meses],
    ['prazo_qualificacao_meses', prazo_qualificacao_meses],
  ]) {
    if (valor !== null && valor !== undefined && (!Number.isInteger(valor) || valor < 0)) {
      return res.status(400).json({ erro: `${campo} deve ser um inteiro ≥ 0 ou null.` });
    }
  }
  if (
    prazo_conclusao_meses != null &&
    prazo_qualificacao_meses != null &&
    prazo_qualificacao_meses > prazo_conclusao_meses
  ) {
    return res.status(400).json({ erro: 'O prazo de qualificação não pode exceder o prazo de conclusão.' });
  }
  return res.json(
    ParametrosModel.update(nivel, {
      prazoConclusaoMeses: prazo_conclusao_meses ?? null,
      prazoQualificacaoMeses: prazo_qualificacao_meses ?? null,
    }),
  );
});
