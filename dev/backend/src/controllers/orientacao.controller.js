import { asyncHandler } from '../middleware/errorHandler.js';
import * as OrientacaoModel from '../models/orientacao.model.js';
import * as ProfessorModel from '../models/professor.model.js';
import * as AlunoModel from '../models/aluno.model.js';
import * as ParametrosModel from '../models/parametros.model.js';
import { calcularPrazos, diasRestantes } from '../services/prazos.service.js';
import { canAcessarOrientacao, requireAcesso } from '../services/acesso.service.js';
import { notificarParticipantes } from '../services/notificacao.service.js';

const TIPOS = ['TCC', 'Mestrado', 'Doutorado'];
const STATUS = ['Em Andamento', 'Concluída', 'Suspensa', 'Cancelada'];

// Anexa os prazos regulatórios (conclusão + qualificação) calculados da
// data de matrícula do aluno + parâmetros vigentes. TCC não tem prazos.
export async function anexarPrazos(orientacoes, parametros) {
  const params = new Map(((await (parametros || ParametrosModel.listAll()))).map((p) => [p.nivel, p]));
  const lista = Array.isArray(orientacoes) ? orientacoes : [orientacoes];
  const out = [];
  for (const o of lista) {
    const calc = await calcularPrazos(o?.aluno?.data_matricula, o?.tipo, params.get(o?.tipo));
    out.push({
      ...o,
      prazos: {
        conclusao: calc.prazo_conclusao,
        qualificacao: calc.prazo_qualificacao,
        dias_para_conclusao: diasRestantes(calc.prazo_conclusao),
        dias_para_qualificacao: diasRestantes(calc.prazo_qualificacao),
      },
    });
  }
  return Array.isArray(orientacoes) ? out : out[0];
}

export const list = asyncHandler(async (req, res) => {
  const { tipo_usuario } = req.user;

  if (tipo_usuario === 'Coordenador' || tipo_usuario === 'Administrador') {
    return res.json(await anexarPrazos(await OrientacaoModel.listAll()));
  }
  if (tipo_usuario === 'Professor') {
    const prof = await ProfessorModel.findByUsuario(req.user.id_usuario);
    if (!prof) return res.status(404).json({ erro: 'Perfil de professor não encontrado.' });
    const [comoOrientador, comoCoOrientador] = await Promise.all([
      OrientacaoModel.listByProfessor(prof.id_professor),
      OrientacaoModel.listByCoOrientador(prof.id_professor),
    ]);
    const mapa = new Map();
    for (const o of [...comoOrientador, ...comoCoOrientador]) mapa.set(o.id_orientacao, o);
    return res.json(await anexarPrazos([...mapa.values()]));
  }
  if (tipo_usuario === 'Aluno') {
    const aluno = await AlunoModel.findByUsuario(req.user.id_usuario);
    if (!aluno) return res.status(404).json({ erro: 'Perfil de aluno não encontrado.' });
    return res.json(await anexarPrazos(await OrientacaoModel.listByAluno(aluno.id_aluno)));
  }
  return res.json([]);
});

export const detail = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const acesso = await canAcessarOrientacao(req.user, id);
  if (!acesso) {
    return res.status(acesso === null ? 404 : 403).json({
      erro: acesso === null ? 'Orientação não encontrada.' : 'Você não tem acesso a esta orientação.',
    });
  }
  return res.json(await anexarPrazos(await OrientacaoModel.findById(id)));
});

export const create = asyncHandler(async (req, res) => {
  if (req.user.tipo_usuario !== 'Professor' && req.user.tipo_usuario !== 'Administrador') {
    return res.status(403).json({ erro: 'Apenas professores podem criar orientações.' });
  }
  const { id_aluno, tipo, titulo_provisorio, data_inicio, data_previsao_fim } = req.body;

  if (!id_aluno || !tipo) {
    return res.status(400).json({ erro: 'Aluno e tipo de orientação são obrigatórios.' });
  }
  if (!TIPOS.includes(tipo)) {
    return res.status(400).json({ erro: `Tipo inválido. Use um de: ${TIPOS.join(', ')}.` });
  }
  const aluno = await AlunoModel.findById(id_aluno);
  if (!aluno) {
    return res.status(404).json({ erro: 'Aluno não encontrado. Cadastre o aluno antes de criar a orientação.' });
  }

  const professor =
    req.user.tipo_usuario === 'Professor' ? await ProfessorModel.findByUsuario(req.user.id_usuario) : null;
  const idOrientador = professor?.id_professor ?? req.body.id_orientador;
  if (!idOrientador) {
    return res.status(400).json({ erro: 'Orientador não identificado.' });
  }
  const orientador = await ProfessorModel.findById(idOrientador);
  if (!orientador) return res.status(404).json({ erro: 'Orientador não encontrado.' });

  const orientacao = await OrientacaoModel.create({
    idOrientador,
    idAluno: id_aluno,
    tipo,
    titulo: titulo_provisorio,
    status: 'Em Andamento',
    dataInicio: data_inicio,
    dataPrevisaoFim: data_previsao_fim,
  });

  await notificarParticipantes(
    orientacao.id_orientacao,
    'orientacao',
    'Nova orientação criada',
    `Uma nova orientação (${tipo}) foi criada.`,
    req.user.id_usuario,
  );

  return res.status(201).json(await anexarPrazos(orientacao));
});

export const update = asyncHandler(async (req, res) => {
  const id = req.params.id;
  if (
    req.user.tipo_usuario !== 'Coordenador' &&
    req.user.tipo_usuario !== 'Administrador' &&
    req.user.tipo_usuario !== 'Professor'
  ) {
    return res.status(403).json({ erro: 'Sem permissão para editar orientações.' });
  }
  const orientacao = await OrientacaoModel.findById(id);
  if (!orientacao) return res.status(404).json({ erro: 'Orientação não encontrada.' });

  if (req.user.tipo_usuario === 'Professor') {
    const prof = await ProfessorModel.findByUsuario(req.user.id_usuario);
    if (!prof || prof.id_professor !== orientacao.orientador.id_professor) {
      return res.status(403).json({ erro: 'Apenas o orientador pode editar esta orientação.' });
    }
  }

  const { titulo_provisorio, status, data_previsao_fim } = req.body;
  if (status && !STATUS.includes(status)) {
    return res.status(400).json({ erro: `Status inválido. Use um de: ${STATUS.join(', ')}.` });
  }
  const atualizada = await OrientacaoModel.update(id, { titulo_provisorio, status, dataPrevisaoFim });
  return res.json(await anexarPrazos(atualizada));
});

export const addCoOrientador = asyncHandler(async (req, res) => {
  const id = req.params.id;
  if (!(await requireAcesso(req, res, id))) return;

  if (req.user.tipo_usuario !== 'Professor' && req.user.tipo_usuario !== 'Coordenador') {
    return res.status(403).json({ erro: 'Sem permissão para adicionar co-orientadores.' });
  }
  const { id_professor } = req.body;
  if (!id_professor) return res.status(400).json({ erro: 'Informe o id_professor.' });

  const orientacao = await OrientacaoModel.findById(id);
  if (id_professor === orientacao.orientador.id_professor) {
    return res.status(400).json({ erro: 'O professor já é o orientador da orientação.' });
  }
  const professor = await ProfessorModel.findById(id_professor);
  if (!professor) return res.status(404).json({ erro: 'Professor não encontrado.' });

  const co = await OrientacaoModel.addCoOrientador(id, id_professor);
  await notificarParticipantes(
    id,
    'orientacao',
    'Novo co-orientador',
    `${professor.nome ?? ''} foi adicionado(a) como co-orientador(a).`,
    req.user.id_usuario,
  );
  return res.status(201).json(co);
});

export const removeCoOrientador = asyncHandler(async (req, res) => {
  const id = req.params.id;
  if (!(await requireAcesso(req, res, id))) return;

  if (req.user.tipo_usuario !== 'Professor' && req.user.tipo_usuario !== 'Coordenador') {
    return res.status(403).json({ erro: 'Sem permissão para remover co-orientadores.' });
  }
  const { id_professor } = req.params;
  await OrientacaoModel.removeCoOrientador(id, id_professor);
  return res.json({ sucesso: true });
});