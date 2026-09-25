import { randomUUID } from 'node:crypto';
import { google } from 'googleapis';
import jwt from 'jsonwebtoken';
import 'dotenv/config';
import * as IntegracaoModel from '../models/integracaoGoogle.model.js';
import { decryptRefreshToken } from '../utils/cryptoTokens.js';

export const GOOGLE_SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/calendar.events',
];

export const FUSO_PADRAO = 'America/Sao_Paulo';

function requiredEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Variável de ambiente ${name} não configurada.`);
  return v;
}

// O redirect_uri precisa bater EXATAMENTE com o registrado no console do Google.
// Se não for informado, derivamos de FRONTEND_URL (única origem real do app),
// evitando o clássico callback em localhost em produção.
export function redirectUriConfigurada() {
  const explicita = (process.env.GOOGLE_REDIRECT_URI || '').trim();
  if (explicita) return explicita;
  const frontend = (process.env.FRONTEND_URL || '').trim().replace(/\/+$/, '');
  return frontend ? `${frontend}/api/integracoes/google/callback` : '';
}

export function newOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID || '',
    process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUriConfigurada(),
  );
}

export function assertGoogleConfig() {
  requiredEnv('GOOGLE_CLIENT_ID');
  requiredEnv('GOOGLE_CLIENT_SECRET');
  if (!redirectUriConfigurada()) {
    throw new Error('Defina GOOGLE_REDIRECT_URI ou FRONTEND_URL para a integração Google.');
  }
}

// state anti-CSRF: JWT curto identificando quem iniciou o fluxo.
export function signState(idUsuario) {
  const secret = process.env.JWT_SECRET || 'dev_secret_sgoa_change_me';
  return jwt.sign({ id_usuario: idUsuario, finalidade: 'google_oauth' }, secret, { expiresIn: '10m' });
}

export function verifyState(state) {
  const secret = process.env.JWT_SECRET || 'dev_secret_sgoa_change_me';
  const payload = jwt.verify(state, secret);
  if (payload?.finalidade !== 'google_oauth' || !payload?.id_usuario) {
    throw new Error('State OAuth inválido.');
  }
  return payload;
}

export function getAuthUrl(idUsuario) {
  assertGoogleConfig();
  const client = newOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: GOOGLE_SCOPES,
    state: signState(idUsuario),
  });
}

export async function trocarCodePorTokens(code) {
  assertGoogleConfig();
  const client = newOAuthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens?.refresh_token) {
    throw new Error('Google não retornou refresh_token (tente reconectar com prompt consent).');
  }
  client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: 'v2', auth: client });
  const { data } = await oauth2.userinfo.get();
  if (!data?.email) throw new Error('Não foi possível obter o e-mail da conta Google.');
  return { tokens, emailGoogle: data.email };
}

export async function getClientParaUsuario(idUsuario) {
  const integracao = await IntegracaoModel.findByUsuario(idUsuario);
  if (!integracao?.refresh_token_enc) return null;
  const refreshToken = decryptRefreshToken(integracao.refresh_token_enc);
  const client = newOAuthClient();
  client.setCredentials({
    refresh_token: refreshToken,
    access_token: integracao.access_token || undefined,
  });
  // Persiste automaticamente cada refresh de access_token.
  client.on('tokens', async (tokens) => {
    try {
      if (tokens?.access_token) {
        const expiraEm = tokens?.expiry_date ? new Date(tokens.expiry_date).toISOString() : null;
        await IntegracaoModel.updateAccessToken(idUsuario, tokens.access_token, expiraEm);
      }
    } catch {
      // Persistência do token não pode quebrar o fluxo principal.
    }
  });
  return { client, emailGoogle: integracao.email_google };
}

export function isInvalidGrant(err) {
  const msg = String(err?.message || '').toLowerCase();
  const code = err?.code || err?.response?.data?.error;
  return code === 'invalid_grant' || msg.includes('invalid_grant') || msg.includes('token has been expired or revoked');
}

export async function criarEventoComMeet(client, { titulo, descricao, inicioISO, fimISO, attendeesEmails = [] }) {
  const calendar = google.calendar({ version: 'v3', auth: client });
  const attendees = [...new Set(attendeesEmails.map((e) => String(e).trim().toLowerCase()))]
    .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
    .map((email) => ({ email }));
  const res = await calendar.events.insert({
    calendarId: 'primary',
    conferenceDataVersion: 1,
    sendUpdates: 'all',
    requestBody: {
      summary: titulo,
      description: descricao || undefined,
      start: { dateTime: inicioISO, timeZone: FUSO_PADRAO },
      end: { dateTime: fimISO, timeZone: FUSO_PADRAO },
      attendees: attendees.length ? attendees : undefined,
      conferenceData: { createRequest: { requestId: randomUUID() } },
    },
  });
  const ev = res?.data;
  const link =
    ev?.hangoutLink ||
    ev?.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video')?.uri ||
    null;
  return { eventId: ev?.id || null, link, htmlLink: ev?.htmlLink || null };
}

export async function excluirEvento(client, eventId) {
  if (!eventId) return;
  const calendar = google.calendar({ version: 'v3', auth: client });
  await calendar.events.delete({ calendarId: 'primary', eventId, sendUpdates: 'all' });
}

export async function revogarRefreshToken(refreshToken) {
  try {
    const client = newOAuthClient();
    await client.revokeToken(refreshToken);
  } catch {
    // Token já inválido: segue com a remoção local.
  }
}
