import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAcesso } from '../services/acesso.service.js';
import * as AtividadeModel from '../models/atividade.model.js';

export const timeline = asyncHandler(async (req, res) => {
  const id = req.params.id;
  if (!(await requireAcesso(req, res, id))) return;
  return res.json(await AtividadeModel.timeline(id));
});