import * as OrientacaoModel from '../models/orientacao.model.js';
import * as ParametrosModel from '../models/parametros.model.js';
import * as ConfigAvisosModel from '../models/configAvisos.model.js';
import * as LembreteModel from '../models/lembrete.model.js';
import * as MensagemModel from '../models/mensagem.model.js';
import { publicProfile } from '../models/usuario.model.js';
import { notificarUsuario } from './notificacao.service.js';
import { calcularPrazos, diasRestantes } from './prazos.service.js';
import { enviarEmail } from './email.service.js';

export const INTERVALO_DIAS = { diaria: 1, semanal: 7, mensal: 30 };

const ROTULO_ETAPA = { qualificacao: 'exame de qualificação', defesa: 'defesa' };

// Verifica uma orientação e envia os avisos devidos (mensagem + notificação + e-mail).
// Retorna a lista de etapas avisadas.
export async function verificarOrientacao(orientacao, { parametros } = {}) {
  const o = orientacao;
  if (!o || o.status !== 'Em Andamento') return [];
  const cfg = await ConfigAvisosModel.getOrDefault(o.id_orientacao);
  const prazos = await calcularPrazos(o.aluno?.data_matricula, o.tipo, parametros?.get?.(o.tipo));
  const hoje = new Date().toISOString().slice(0, 10);
  const avisadas = [];

  for (const etapa of LembreteModel.ETAPAS) {
    const prazo = etapa === 'qualificacao' ? prazos.prazo_qualificacao : prazos.prazo_conclusao;
    const concluidaEm =
      etapa === 'qualificacao' ? o.etapas?.qualificacao_concluida_em : o.etapas?.defesa_concluida_em;
    if (!prazo || concluidaEm) continue; // TCC não tem qualificação; etapa já concluída.

    const dias = diasRestantes(prazo);
    const diasAntes = etapa === 'qualificacao' ? cfg.dias_antes_qualificacao : cfg.dias_antes_defesa;
    if (dias == null || dias > diasAntes) continue; // fora da janela (inclui atrasados).

    const ultimo = await LembreteModel.ultimoEnvio(o.id_orientacao, etapa);
    const intervalo = INTERVALO_DIAS[cfg.frequencia] ?? 7;
    if (ultimo) {
      const diasDesde = Math.floor((new Date(`${hoje}T00:00:00`) - new Date(ultimo.data_envio)) / 86400000);
      if (diasDesde < intervalo) continue; // frequência ainda não vencida.
    }

    await enviarAviso(o, etapa, prazo, dias);
    avisadas.push(etapa);
  }
  return avisadas;
}

async function enviarAviso(o, etapa, prazo, dias) {
  const rotulo = ROTULO_ETAPA[etapa];
  const quando = dias < 0 ? `está ${Math.abs(dias)} dias em atraso` : dias === 0 ? 'vence hoje' : `vence em ${dias} dias`;
  const texto =
    `Olá ${o.aluno?.nome}, o prazo máximo para ${rotulo} do seu ${o.tipo} ` +
    `(${prazo.split('-').reverse().join('/')}) ${quando}. ` +
    `Procure seu orientador para regularizar esta etapa.`;

  // Mensagem automatizada na orientação, em nome do orientador.
  await MensagemModel.create({
    idOrientacao: o.id_orientacao,
    idRemetente: o.orientador?.id_usuario,
    conteudo: `[Aviso automático] ${texto}`,
  });
  await notificarUsuario(
    o.aluno?.id_usuario,
    'prazo',
    `Prazo de ${rotulo} se aproximando`,
    texto,
  );
  const perfil = o.aluno?.id_usuario ? await publicProfile(o.aluno.id_usuario) : null;
  if (perfil?.email) {
    // Remetente = conta institucional única do projeto (SMTP_USER/SMTP_FROM).
    await enviarEmail({
      para: perfil.email,
      assunto: `SGOA: prazo de ${rotulo}`,
      texto,
    });
  }
  await LembreteModel.registrar(o.id_orientacao, etapa);
}

// Varre todas as orientações em andamento. Idempotente (tabela de envios).
export async function verificarTodas() {
  const params = new Map((await ParametrosModel.listAll()).map((p) => [p.nivel, p]));
  const todas = (await OrientacaoModel.listAll()).filter((o) => o.status === 'Em Andamento');
  const resultado = [];
  for (const o of todas) {
    const etapas = await verificarOrientacao(o, { parametros: params });
    if (etapas.length) resultado.push({ id_orientacao: o.id_orientacao, etapas });
  }
  return resultado;
}
