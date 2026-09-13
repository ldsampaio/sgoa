import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAcesso } from '../services/acesso.service.js';
import * as ReuniaoModel from '../models/reuniao.model.js';
import * as OrientacaoModel from '../models/orientacao.model.js';
import * as UsuarioModel from '../models/usuario.model.js';
import * as IntegracaoModel from '../models/integracaoGoogle.model.js';
import { notificarParticipantes } from '../services/notificacao.service.js';
import {
  criarEventoComMeet,
  excluirEvento,
  getClientParaUsuario,
  isInvalidGrant,
} from '../services/googleCalendar.service.js';

export const listByOrientacao = asyncHandler(async (req, res) => {
  const id = req.params.id;
  if (!(await requireAcesso(req, res, id))) return;
  return res.json(await ReuniaoModel.listByOrientacao(id));
});

function validarLink(link) {
  if (!link) return null;
  const v = String(link).trim();
  if (!v) return null;
  if (!/^https:\/\/(meet\.google\.com|calendar\.google\.com)\//.test(v)) {
    const err = new Error('Link inválido: informe um link do Google Meet/Calendar (https://meet.google.com/...).');
    err.status = 400;
    throw err;
  }
  return v;
}

function normalizarDuracao(duracaoMinutos) {
  if (duracaoMinutos === undefined || duracaoMinutos === null || duracaoMinutos === '') return 60;
  const n = Number(duracaoMinutos);
  if (!Number.isFinite(n) || n < 15 || n > 480) {
    const err = new Error('Duração inválida: use entre 15 e 480 minutos.');
    err.status = 400;
    throw err;
  }
  return Math.round(n);
}

// Resolve e-mails dos convidados (attendees) a partir da orientação + participantes enviados.
// Organizador (req.user) NÃO entra como attendee — ele é o dono do evento no Calendar.
export async function resolverAttendeesEmails(idOrientacao, participantesBody, emailOrganizador) {
  const orientacao = await OrientacaoModel.findById(idOrientacao);
  const ids = new Set();
  if (orientacao?.aluno?.id_usuario) ids.add(orientacao.aluno.id_usuario);
  for (const c of orientacao?.co_orientadores || []) {
    if (c?.id_usuario) ids.add(c.id_usuario);
  }
  // Compat: participantes historicamente é [id_usuario...]; o form atual envia [].
  for (const p of Array.isArray(participantesBody) ? participantesBody : []) {
    const id = typeof p === 'string' ? p : p?.id_usuario;
    if (id) ids.add(id);
  }
  const organizador = String(emailOrganizador || '').toLowerCase();
  const emails = new Set();
  for (const id of ids) {
    const u = await UsuarioModel.findById(id);
    const email = String(u?.email || '').trim().toLowerCase();
    if (!email || email === organizador) continue;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;
    emails.add(email);
  }
  return { emails: [...emails], orientacao };
}

export const create = asyncHandler(async (req, res) => {
  const id = req.params.id;
  if (!(await requireAcesso(req, res, id))) return;

  if (req.user.tipo_usuario === 'Aluno') {
    return res.status(403).json({ erro: 'Somente orientador ou coordenador podem registrar reuniões.' });
  }
  const {
    data_hora,
    pauta,
    decisoes_proximos_passos,
    participantes,
    link: linkManual,
    criarNoGoogle,
    duracaoMinutos,
  } = req.body;
  if (!data_hora) {
    return res.status(400).json({ erro: 'Data e hora da reunião são obrigatórias.' });
  }
  const inicio = new Date(data_hora);
  if (Number.isNaN(inicio.getTime())) {
    return res.status(400).json({ erro: 'Data e hora em formato inválido.' });
  }
  if (inicio.getTime() < Date.now() - 5 * 60 * 1000) {
    return res.status(400).json({ erro: 'A reunião precisa ser agora ou no futuro.' });
  }
  let link = validarLink(linkManual);
  let googleEventId = null;

  if (criarNoGoogle === true || criarNoGoogle === 'true' || criarNoGoogle === 1) {
    const duracao = normalizarDuracao(duracaoMinutos);
    const sessao = await getClientParaUsuario(req.user.id_usuario).catch((err) => {
      if (String(err?.message || '').includes('GOOGLE_TOKEN_KEY')) {
        const e = new Error('Integração Google mal configurada no servidor (GOOGLE_TOKEN_KEY).');
        e.status = 500;
        throw e;
      }
      throw err;
    });
    if (!sessao) {
      return res.status(409).json({ erro: 'Google não conectado. Conecte sua conta para agendar.', code: 'GOOGLE_NAO_CONECTADO' });
    }
    const { emails, orientacao } = await resolverAttendeesEmails(id, participantes, req.user.email);
    const fim = new Date(inicio.getTime() + duracao * 60 * 1000);
    const titulo = `Reunião de orientação — ${orientacao?.titulo_provisorio || orientacao?.tipo || 'SGOA'} — ${orientacao?.aluno?.nome || ''}`.trim();
    const frontend = process.env.FRONTEND_URL || '';
    const descricao = [
      pauta ? `Pauta: ${pauta}` : null,
      decisoes_proximos_passos ? `Decisões/próximos passos: ${decisoes_proximos_passos}` : null,
      frontend ? `Registro no SGOA: ${frontend}/orientacoes/${id}` : null,
    ]
      .filter(Boolean)
      .join('\n');
    try {
      const ev = await criarEventoComMeet(sessao.client, {
        titulo,
        descricao,
        inicioISO: inicio.toISOString(),
        fimISO: fim.toISOString(),
        attendeesEmails: emails,
      });
      if (!ev?.link) {
        return res.status(502).json({ erro: 'Google Calendar criou o evento, mas não retornou link Meet.', code: 'GOOGLE_SEM_LINK' });
      }
      link = ev.link;
      googleEventId = ev.eventId;
    } catch (err) {
      if (isInvalidGrant(err)) {
        await IntegracaoModel.removeByUsuario(req.user.id_usuario);
        return res
          .status(409)
          .json({ erro: 'Conexão Google expirada ou revogada. Reconecte sua conta.', code: 'GOOGLE_RECONECTAR' });
      }
      const e = new Error(`Falha ao criar evento no Google Calendar: ${err.message || err}`);
      e.status = 502;
      e.code = 'GOOGLE_API_FALHOU';
      throw e;
    }
  }

  const reuniao = await ReuniaoModel.create({
    idOrientacao: id,
    dataHora: data_hora,
    pauta,
    decisoes: decisoes_proximos_passos,
    participantes: participantes ?? [],
    link,
    googleEventId,
  });
  const quando = new Date(data_hora).toLocaleString('pt-BR');
  await notificarParticipantes(
    id,
    'reuniao',
    'Nova reunião registrada',
    `Reunião ${pauta ? `"${pauta}"` : ''} registrada em ${quando}.${link ? ` Entrar: ${link}` : ''}`,
    req.user.id_usuario,
  );
  return res.status(201).json(reuniao);
});

// DELETE /api/orientacoes/:id/reunioes/:idReuniao
// Apaga o registro local e, se houver google_event_id, tenta excluir o evento no Calendar do professor.
export const remove = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const idReuniao = req.params.idReuniao;
  if (!(await requireAcesso(req, res, id))) return;
  if (req.user.tipo_usuario === 'Aluno') {
    return res.status(403).json({ erro: 'Somente orientador ou coordenador podem excluir reuniões.' });
  }
  const reuniao = await ReuniaoModel.findByIdInOrientacao(idReuniao, id);
  if (!reuniao) return res.status(404).json({ erro: 'Reunião não encontrada.' });

  if (reuniao.google_event_id) {
    const sessao = await getClientParaUsuario(req.user.id_usuario).catch(() => null);
    if (sessao) {
      try {
        await excluirEvento(sessao.client, reuniao.google_event_id);
      } catch (err) {
        if (isInvalidGrant(err)) {
          await IntegracaoModel.removeByUsuario(req.user.id_usuario);
          return res
            .status(409)
            .json({ erro: 'Conexão Google expirada. Reconecte e tente excluir novamente.', code: 'GOOGLE_RECONECTAR' });
        }
        // Evento pode já ter sido excluído no Google (404/410): segue com a exclusão local.
        const status = err?.code || err?.response?.status;
        if (status !== 404 && status !== 410) {
          const e = new Error(`Falha ao excluir evento no Google Calendar: ${err.message || err}`);
          e.status = 502;
          throw e;
        }
      }
    }
    // Sem sessão Google: exclui só o registro local (evento permanece no Calendar do professor).
  }

  await ReuniaoModel.removeById(idReuniao);
  return res.status(204).end();
});
