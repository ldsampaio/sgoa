import { asyncHandler } from '../middleware/errorHandler.js';
import * as OrientacaoModel from '../models/orientacao.model.js';
import * as ProfessorModel from '../models/professor.model.js';
import * as ConfigAvisosModel from '../models/configAvisos.model.js';
import * as LembreteModel from '../models/lembrete.model.js';
import { verificarOrientacao, verificarTodas } from '../services/lembretes.service.js';
import { anexarPrazos } from './orientacao.controller.js';
import { requireAcesso } from '../services/acesso.service.js';

function dataValida(valor) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const [a, m, d] = valor.split('-').map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d));
  if (dt.getUTCFullYear() !== a || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return false;
  return valor <= new Date().toISOString().slice(0, 10);
}

async function podeGerenciarEtapas(req, orientacao) {
  if (['Coordenador', 'Administrador'].includes(req.user?.tipo_usuario)) return true;
  if (req.user?.tipo_usuario !== 'Professor') return false;
  const prof = await ProfessorModel.findByUsuario(req.user.id_usuario);
  return !!prof && prof.id_professor === orientacao.orientador.id_professor;
}

// Disparo manual da verificação (testes/diagnóstico). Idempotente.
export const verificar = asyncHandler(async (req, res) => {
  const { id_orientacao } = req.body ?? {};
  if (id_orientacao) {
    const o = await OrientacaoModel.findById(String(id_orientacao));
    if (!o) return res.status(404).json({ erro: 'Orientação não encontrada.' });
    return res.json({ avisos: [{ id_orientacao: o.id_orientacao, etapas: await verificarOrientacao(o) }] });
  }
  return res.json({ avisos: await verificarTodas() });
});

// Marca a conclusão de qualificação/defesa (orientador; RPA usa origem='rpa').
export const marcarEtapas = asyncHandler(async (req, res) => {
  const orientacao = await OrientacaoModel.findById(req.params.id);
  if (!orientacao) return res.status(404).json({ erro: 'Orientação não encontrada.' });
  if (!(await podeGerenciarEtapas(req, orientacao))) {
    return res.status(403).json({ erro: 'Apenas o orientador pode marcar a conclusão das etapas.' });
  }
  const { qualificacao_concluida_em, defesa_concluida_em, origem } = req.body ?? {};
  for (const [campo, valor] of [
    ['qualificacao_concluida_em', qualificacao_concluida_em],
    ['defesa_concluida_em', defesa_concluida_em],
  ]) {
    if (valor !== undefined && valor !== null && !dataValida(valor)) {
      return res.status(400).json({ erro: `${campo} inválida. Use YYYY-MM-DD, não futura.` });
    }
  }
  if (orientacao.tipo === 'TCC' && qualificacao_concluida_em) {
    return res.status(400).json({ erro: 'TCC não possui exame de qualificação.' });
  }
  if (origem !== undefined && !['manual', 'rpa'].includes(origem)) {
    return res.status(400).json({ erro: "origem deve ser 'manual' ou 'rpa'." });
  }
  const atualizada = await OrientacaoModel.updateEtapas(req.params.id, {
    qualificacaoConcluidaEm: qualificacao_concluida_em ?? undefined,
    defesaConcluidaEm: defesa_concluida_em ?? undefined,
    origem: origem ?? 'manual',
  });
  return res.json(await anexarPrazos(atualizada));
});

export const getConfig = asyncHandler(async (req, res) => {
  const orientacao = await OrientacaoModel.findById(req.params.id);
  if (!orientacao) return res.status(404).json({ erro: 'Orientação não encontrada.' });
  if (!(await requireAcesso(req, res, req.params.id))) return;
  return res.json(await ConfigAvisosModel.getOrDefault(req.params.id));
});

export const updateConfig = asyncHandler(async (req, res) => {
  const orientacao = await OrientacaoModel.findById(req.params.id);
  if (!orientacao) return res.status(404).json({ erro: 'Orientação não encontrada.' });
  if (!(await podeGerenciarEtapas(req, orientacao))) {
    return res.status(403).json({ erro: 'Apenas o orientador pode configurar os avisos.' });
  }
  const { dias_antes_qualificacao, dias_antes_defesa, frequencia } = req.body ?? {};
  for (const [campo, valor] of [
    ['dias_antes_qualificacao', dias_antes_qualificacao],
    ['dias_antes_defesa', dias_antes_defesa],
  ]) {
    if (!Number.isInteger(valor) || valor < 0) {
      return res.status(400).json({ erro: `${campo} deve ser um inteiro ≥ 0.` });
    }
  }
  if (!ConfigAvisosModel.FREQUENCIAS.includes(frequencia)) {
    return res.status(400).json({ erro: `frequencia deve ser uma de: ${ConfigAvisosModel.FREQUENCIAS.join(', ')}.` });
  }
  return res.json(
    await ConfigAvisosModel.update(req.params.id, {
      diasAntesQualificacao: dias_antes_qualificacao,
      diasAntesDefesa: dias_antes_defesa,
      frequencia,
    }),
  );
});

export const listarEnvios = asyncHandler(async (req, res) => {
  const orientacao = await OrientacaoModel.findById(req.params.id);
  if (!orientacao) return res.status(404).json({ erro: 'Orientação não encontrada.' });
  if (!(await requireAcesso(req, res, req.params.id))) return;
  return res.json(await LembreteModel.listarPorOrientacao(req.params.id));
});
