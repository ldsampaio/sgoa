import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAcesso } from '../services/acesso.service.js';
import * as TarefaModel from '../models/tarefa.model.js';
import { notificarParticipantes } from '../services/notificacao.service.js';
import {
  normalizarTitulo,
  normalizarDescricao,
  normalizarPrioridade,
  normalizarCor,
  normalizarStatus,
  normalizarOrdem,
} from '../services/tarefaValidacao.js';
import { podeArquivarTarefa } from '../services/tarefaPermissoes.js';

const PAPEIS_CRIACAO = ['Professor', 'Coordenador', 'Administrador'];

export const listByOrientacao = asyncHandler(async (req, res) => {
  const id = req.params.id;
  if (!(await requireAcesso(req, res, id))) return;
  return res.json(await TarefaModel.listByOrientacao(id));
});

export const create = asyncHandler(async (req, res) => {
  const id = req.params.id;
  if (!(await requireAcesso(req, res, id))) return;
  if (!PAPEIS_CRIACAO.includes(req.user.tipo_usuario)) {
    return res.status(403).json({ erro: 'Apenas professor, coordenador ou administrador pode criar cartões.' });
  }

  const { id_responsavel, titulo, descricao, data_limite, prioridade, cor } = req.body;
  if (!id_responsavel) {
    return res.status(400).json({ erro: 'Responsável é obrigatório.' });
  }

  const tarefa = await TarefaModel.create({
    idOrientacao: id,
    idResponsavel: id_responsavel,
    idCriador: req.user.id_usuario,
    titulo: normalizarTitulo(titulo),
    descricao: normalizarDescricao(descricao, { obrigatoria: true }),
    dataLimite: data_limite ?? null,
    prioridade: normalizarPrioridade(prioridade),
    cor: normalizarCor(cor),
  });

  const responsavel = tarefa.nome_responsavel || 'Usuário';
  await notificarParticipantes(
    id,
    'tarefa',
    'Nova tarefa atribuída',
    `Tarefa "${tarefa.titulo}" atribuída a ${responsavel}.`,
    req.user.id_usuario,
  );
  return res.status(201).json(tarefa);
});

export const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const tarefa = await TarefaModel.findById(id);
  if (!tarefa) return res.status(404).json({ erro: 'Tarefa não encontrada.' });

  if (!(await requireAcesso(req, res, tarefa.id_orientacao))) return;

  const dados = {};
  if (req.body.titulo !== undefined) dados.titulo = normalizarTitulo(req.body.titulo);
  if (req.body.descricao !== undefined) {
    dados.descricao = normalizarDescricao(req.body.descricao, { obrigatoria: true });
  }
  if (req.body.prioridade !== undefined) dados.prioridade = normalizarPrioridade(req.body.prioridade);
  if (req.body.cor !== undefined) dados.cor = normalizarCor(req.body.cor);
  if (req.body.id_responsavel !== undefined) {
    if (!req.body.id_responsavel) {
      return res.status(400).json({ erro: 'Responsável é obrigatório.' });
    }
    dados.id_responsavel = req.body.id_responsavel;
  }
  if (req.body.data_limite !== undefined) dados.data_limite = req.body.data_limite || null;
  if (req.body.status !== undefined) dados.status = normalizarStatus(req.body.status);
  if (req.body.ordem !== undefined) {
    const ordem = normalizarOrdem(req.body.ordem);
    if (ordem === null) return res.status(400).json({ erro: 'Ordem do cartão é obrigatória.' });
    dados.ordem = ordem;
  }

  if (Object.keys(dados).length === 0) {
    return res.status(400).json({ erro: 'Nenhum campo para atualizar.' });
  }

  const mudouStatus = dados.status !== undefined && dados.status !== tarefa.status;
  const atualizada = await TarefaModel.update(id, dados);

  if (mudouStatus) {
    await notificarParticipantes(
      tarefa.id_orientacao,
      'tarefa',
      'Tarefa atualizada',
      `Tarefa "${atualizada.titulo}" está "${atualizada.status}".`,
      req.user.id_usuario,
    );
  }
  return res.json(atualizada);
});

export const arquivar = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const tarefa = await TarefaModel.findById(id);
  if (!tarefa) return res.status(404).json({ erro: 'Tarefa não encontrada.' });

  if (!(await requireAcesso(req, res, tarefa.id_orientacao))) return;

  if (!podeArquivarTarefa(req.user, tarefa)) {
    return res.status(403).json({ erro: 'Você não pode arquivar esta tarefa.' });
  }

  const arquivada = await TarefaModel.arquivar(id, req.user.id_usuario);
  if (!arquivada) return res.status(404).json({ erro: 'Tarefa não encontrada.' });
  return res.status(204).send();
});
