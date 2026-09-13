import { asyncHandler } from '../middleware/errorHandler.js';
import { all } from '../utils/query.js';
import * as OrientacaoModel from '../models/orientacao.model.js';
import * as ProfessorModel from '../models/professor.model.js';
import * as AlunoModel from '../models/aluno.model.js';
import * as TarefaModel from '../models/tarefa.model.js';
import * as NotificacaoModel from '../models/notificacao.model.js';

export const dashboardProfessor = asyncHandler(async (req, res) => {
  const prof = await ProfessorModel.findByUsuario(req.user.id_usuario);
  if (!prof) return res.status(404).json({ erro: 'Perfil de professor não encontrado.' });

  const [orientacoes, coOrientacoes] = await Promise.all([
    OrientacaoModel.listByProfessor(prof.id_professor),
    OrientacaoModel.listByCoOrientador(prof.id_professor),
  ]);
  const mapa = new Map();
  for (const o of [...orientacoes, ...coOrientacoes]) mapa.set(o.id_orientacao, o);
  const todas = [...mapa.values()];
  const ativas = todas.filter((o) => o.status === 'Em Andamento');

  const ids = todas.map((o) => o.id_orientacao);
  const tarefas = await TarefaModel.listPendentesPorOrientacoes(ids);
  const notificacoes = await NotificacaoModel.listForUsuario(req.user.id_usuario);

  return res.json({ orientacoes: todas, orientacoes_ativas: ativas, tarefas_pendentes: tarefas, notificacoes });
});

export const dashboardAluno = asyncHandler(async (req, res) => {
  const aluno = await AlunoModel.findByUsuario(req.user.id_usuario);
  if (!aluno) return res.status(404).json({ erro: 'Perfil de aluno não encontrado.' });

  const orientacoes = await OrientacaoModel.listByAluno(aluno.id_aluno);
  const atual = orientacoes.find((o) => o.status === 'Em Andamento') || orientacoes[0] || null;

  const ids = orientacoes.map((o) => o.id_orientacao);
  const [tarefas, notificacoes] = await Promise.all([
    TarefaModel.listParaDashboard(req.user.id_usuario, { orientacoesIds: ids.length ? ids : null }),
    NotificacaoModel.listForUsuario(req.user.id_usuario),
  ]);
  const pendentes = tarefas.filter((t) => t.status !== 'Concluída');

  return res.json({ orientacao_atual: atual, orientacoes, tarefas_pendentes: pendentes, notificacoes });
});

export const dashboardCoordenador = asyncHandler(async (req, res) => {
  const orientacoes = await OrientacaoModel.listAll();

  const porStatus = orientacoes.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});
  const porTipo = orientacoes.reduce((acc, o) => {
    acc[o.tipo] = (acc[o.tipo] || 0) + 1;
    return acc;
  }, {});

  const prazosCriticos = orientacoes
    .filter((o) => o.data_previsao_fim)
    .map((o) => ({ ...o, dias_restantes: Math.ceil((new Date(o.data_previsao_fim) - new Date()) / 86400000) }))
    .filter((o) => o.status === 'Em Andamento' && o.dias_restantes <= 60)
    .sort((a, b) => a.dias_restantes - b.dias_restantes)
    .slice(0, 10);

  const carga = all(
    `SELECT pr.id_professor, u.nome AS nome, COUNT(o.id_orientacao) AS total
     FROM professores pr
     JOIN usuarios u ON u.id_usuario = pr.id_usuario
     LEFT JOIN orientacoes o ON o.id_orientador = pr.id_professor AND o.status = 'Em Andamento'
     GROUP BY pr.id_professor
     ORDER BY total DESC, u.nome`,
  );

  const notificacoes = await NotificacaoModel.listForUsuario(req.user.id_usuario);
  return res.json({
    total: orientacoes.length,
    por_status: porStatus,
    por_tipo: porTipo,
    prazos_criticos: prazosCriticos,
    carga_professores: carga,
    notificacoes,
  });
});