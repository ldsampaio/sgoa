import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAcesso } from '../services/acesso.service.js';
import * as ReuniaoModel from '../models/reuniao.model.js';
import { notificarParticipantes } from '../services/notificacao.service.js';

export const listByOrientacao = asyncHandler(async (req, res) => {
  const id = req.params.id;
  if (!(await requireAcesso(req, res, id))) return;
  return res.json(await ReuniaoModel.listByOrientacao(id));
});

export const create = asyncHandler(async (req, res) => {
  const id = req.params.id;
  if (!(await requireAcesso(req, res, id))) return;

  if (req.user.tipo_usuario === 'Aluno') {
    return res.status(403).json({ erro: 'Somente orientador ou coordenador podem registrar reuniões.' });
  }
  const { data_hora, pauta, decisoes_proximos_passos, participantes } = req.body;
  if (!data_hora) {
    return res.status(400).json({ erro: 'Data e hora da reunião são obrigatórias.' });
  }
  const reuniao = await ReuniaoModel.create({
    idOrientacao: id,
    dataHora: data_hora,
    pauta,
    decisoes: decisoes_proximos_passos,
    participantes: participantes ?? [],
  });
  await notificarParticipantes(
    id,
    'reuniao',
    'Nova reunião registrada',
    `Reunião ${pauta ? `"${pauta}"` : ''} registrada em ${new Date(data_hora).toLocaleString('pt-BR')}.`,
    req.user.id_usuario,
  );
  return res.status(201).json(reuniao);
});