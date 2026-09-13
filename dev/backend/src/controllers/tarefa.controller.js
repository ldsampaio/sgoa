import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAcesso } from '../services/acesso.service.js';
import * as TarefaModel from '../models/tarefa.model.js';
import { notificarParticipantes } from '../services/notificacao.service.js';

export const listByOrientacao = asyncHandler(async (req, res) => {
  const id = req.params.id;
  if (!(await requireAcesso(req, res, id))) return;
  return res.json(await TarefaModel.listByOrientacao(id));
});

export const create = asyncHandler(async (req, res) => {
  const id = req.params.id;
  if (!(await requireAcesso(req, res, id))) return;

  const { id_responsavel, descricao, data_limite } = req.body;
  if (!id_responsavel || !descricao) {
    return res.status(400).json({ erro: 'Responsável e descrição são obrigatórios.' });
  }
  const tarefa = await TarefaModel.create({
    idOrientacao: id,
    idResponsavel: id_responsavel,
    descricao,
    dataLimite: data_limite,
  });

  const responsavel = tarefa.nome_responsavel || 'Usuário';
  await notificarParticipantes(
    id,
    'tarefa',
    'Nova tarefa atribuída',
    `Tarefa "${descricao}" atribuída a ${responsavel}.`,
    req.user.id_usuario,
  );
  return res.status(201).json(tarefa);
});

export const updateStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const tarefa = await TarefaModel.findById(id);
  if (!tarefa) return res.status(404).json({ erro: 'Tarefa não encontrada.' });

  if (!(await requireAcesso(req, res, tarefa.id_orientacao))) return;

  if (req.user.tipo_usuario === 'Aluno' && tarefa.id_responsavel !== req.user.id_usuario) {
    return res.status(403).json({ erro: 'Você só pode atualizar as próprias tarefas.' });
  }

  const atualizada = await TarefaModel.updateStatus(id, status);
  await notificarParticipantes(
    tarefa.id_orientacao,
    'tarefa',
    'Tarefa atualizada',
    `Tarefa "${tarefa.descricao}" está "${atualizada.status}".`,
    req.user.id_usuario,
  );
  return res.json(atualizada);
});