import { asyncHandler } from '../middleware/errorHandler.js';
import { all } from '../utils/query.js';
import * as OrientacaoModel from '../models/orientacao.model.js';
import * as ProfessorModel from '../models/professor.model.js';
import * as AlunoModel from '../models/aluno.model.js';
import * as TarefaModel from '../models/tarefa.model.js';
import * as NotificacaoModel from '../models/notificacao.model.js';
import * as EnlaceModel from '../models/enlaceOverleaf.model.js';
import { anexarPrazos } from './orientacao.controller.js';
import { diasRestantes } from '../services/prazos.service.js';

export const dashboardProfessor = asyncHandler(async (req, res) => {
  const prof = await ProfessorModel.findByUsuario(req.user.id);
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
  const notificacoes = await NotificacaoModel.listForUsuario(req.user.id);
  // RF.OV.004 — o card do dashboard lista os links (fixados primeiro) de cada orientação.
  const enlaces = await EnlaceModel.listByOrientacoes(ids, req.user.id);

  return res.json({
    orientacoes: todas,
    orientacoes_ativas: ativas,
    tarefas_pendentes: tarefas,
    notificacoes,
    enlaces,
  });
});

export const dashboardAluno = asyncHandler(async (req, res) => {
  const aluno = await AlunoModel.findByUsuario(req.user.id);
  if (!aluno) return res.status(404).json({ erro: 'Perfil de aluno não encontrado.' });

  const orientacoes = await OrientacaoModel.listByAluno(aluno.id_aluno);
  const atual = orientacoes.find((o) => o.status === 'Em Andamento') || orientacoes[0] || null;

  const ids = orientacoes.map((o) => o.id_orientacao);
  const [tarefas, notificacoes] = await Promise.all([
    TarefaModel.listParaDashboard(req.user.id, { orientacoesIds: ids.length ? ids : null }),
    NotificacaoModel.listForUsuario(req.user.id),
  ]);
  const pendentes = tarefas.filter((t) => t.status !== 'Concluída');
  const enlaces = await EnlaceModel.listByOrientacoes(ids, req.user.id);

  return res.json({
    orientacao_atual: atual,
    orientacoes,
    tarefas_pendentes: pendentes,
    notificacoes,
    enlaces,
  });
});

export const dashboardCoordenador = asyncHandler(async (req, res) => {
  const orientacoes = await anexarPrazos(await OrientacaoModel.listAll());

  const porStatus = orientacoes.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});
  const porTipo = orientacoes.reduce((acc, o) => {
    acc[o.tipo] = (acc[o.tipo] || 0) + 1;
    return acc;
  }, {});

  // Prazos críticos: previsão de fim + prazos regulatórios (conclusão/qualificação).
  const candidatos = [];
  for (const o of orientacoes) {
    if (o.status !== 'Em Andamento') continue;
    if (o.data_previsao_fim) {
      candidatos.push({ ...o, tipo_prazo: 'previsao_fim', dias_restantes: diasRestantes(o.data_previsao_fim) });
    }
    if (o.prazos?.conclusao) {
      candidatos.push({
        ...o,
        tipo_prazo: 'conclusao_regulamentar',
        dias_restantes: diasRestantes(o.prazos.conclusao),
      });
    }
    if (o.prazos?.qualificacao) {
      candidatos.push({
        ...o,
        tipo_prazo: 'qualificacao',
        dias_restantes: diasRestantes(o.prazos.qualificacao),
      });
    }
  }
  const prazosCriticos = candidatos
    .filter((o) => o.dias_restantes != null && o.dias_restantes <= 60)
    .sort((a, b) => a.dias_restantes - b.dias_restantes)
    .slice(0, 10);

  const carga = await all(
    `SELECT pr.id_professor, u.name AS nome, COUNT(o.id_orientacao) AS total
     FROM professores pr
     JOIN auth.users u ON u.id = pr.id_usuario
     LEFT JOIN orientacoes o ON o.id_orientador = pr.id_professor AND o.status = 'Em Andamento'
     GROUP BY pr.id_professor, u.name
     ORDER BY total DESC, u.name`,
  );

  const notificacoes = await NotificacaoModel.listForUsuario(req.user.id);
  const enlaces = await EnlaceModel.listByOrientacoes(orientacoes.map((o) => o.id_orientacao), req.user.id);
  return res.json({
    total: orientacoes.length,
    por_status: porStatus,
    por_tipo: porTipo,
    prazos_criticos: prazosCriticos,
    carga_professores: carga,
    notificacoes,
    enlaces,
  });
});