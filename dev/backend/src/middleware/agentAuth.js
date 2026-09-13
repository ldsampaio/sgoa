import { authenticate } from './auth.js';

// Token de serviço do agente de IA externo (rede interna).
export function isAgentToken(req) {
  const configurado = process.env.AGENTE_IA_TOKEN;
  if (!configurado) return false;
  const header = req.headers.authorization || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : null;
  const token = req.headers['x-agent-token'] || bearer;
  return !!token && token === configurado;
}

// Para rotas que o agente pode acessar: pula o JWT se o token de serviço for válido.
export function agentOuAuth(req, res, next) {
  if (isAgentToken(req)) {
    req.agente = true;
    return next();
  }
  return authenticate(req, res, next);
}
