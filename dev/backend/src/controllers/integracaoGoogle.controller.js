import { asyncHandler } from '../middleware/errorHandler.js';
import * as IntegracaoModel from '../models/integracaoGoogle.model.js';
import { encryptRefreshToken, decryptRefreshToken } from '../utils/cryptoTokens.js';
import {
  getAuthUrl,
  trocarCodePorTokens,
  verifyState,
  revogarRefreshToken,
} from '../services/googleCalendar.service.js';

export const authUrl = asyncHandler(async (req, res) => {
  const url = getAuthUrl(req.user.id_usuario);
  return res.json({ url });
});

export const status = asyncHandler(async (req, res) => {
  const integracao = IntegracaoModel.findByUsuario(req.user.id_usuario);
  if (!integracao) return res.json({ conectado: false, email_google: null });
  return res.json({ conectado: true, email_google: integracao.email_google });
});

// Callback público do Google: valida state, troca code, persiste refresh criptografado.
export const callback = asyncHandler(async (req, res) => {
  const { code, state, error } = req.query;
  const frontend = process.env.FRONTEND_URL || 'http://localhost:5173';
  if (error) return res.redirect(`${frontend}/google-ok?erro=${encodeURIComponent(String(error))}`);
  if (!code || !state) return res.redirect(`${frontend}/google-ok?erro=oauth_invalido`);
  let payload;
  try {
    payload = verifyState(String(state));
  } catch {
    return res.redirect(`${frontend}/google-ok?erro=state_invalido`);
  }
  try {
    const { tokens, emailGoogle } = await trocarCodePorTokens(String(code));
    const dominio = (process.env.GOOGLE_WORKSPACE_DOMAIN || '').trim().toLowerCase();
    if (dominio && !String(emailGoogle).toLowerCase().endsWith(`@${dominio}`)) {
      return res.redirect(`${frontend}/google-ok?erro=dominio_invalido`);
    }
    const expiraEm = tokens?.expiry_date ? new Date(tokens.expiry_date).toISOString() : null;
    IntegracaoModel.upsert({
      idUsuario: payload.id_usuario,
      emailGoogle,
      refreshTokenEnc: encryptRefreshToken(tokens.refresh_token),
      accessToken: tokens.access_token || null,
      expiraEm,
    });
    return res.redirect(`${frontend}/google-ok?google=conectado&email=${encodeURIComponent(emailGoogle)}`);
  } catch (err) {
    return res.redirect(`${frontend}/google-ok?erro=${encodeURIComponent(err.message || 'falha_oauth')}`);
  }
});

export const disconnect = asyncHandler(async (req, res) => {
  const integracao = IntegracaoModel.findByUsuario(req.user.id_usuario);
  if (integracao?.refresh_token_enc) {
    try {
      await revogarRefreshToken(decryptRefreshToken(integracao.refresh_token_enc));
    } catch {
      // Segue com a remoção local mesmo se a revogação falhar.
    }
  }
  IntegracaoModel.removeByUsuario(req.user.id_usuario);
  return res.status(204).end();
});
